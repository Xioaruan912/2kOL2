import time
import hmac
import hashlib
import base64
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from backend.config import UPSTREAM_BASE_URL, SECRET_KEY, APPNAME, USER_AGENT, REQUEST_TIMEOUT


class CryptoProtocolError(Exception):
    pass


class UpstreamClient:
    """
    Reverse-engineered client for WeChat Mini Program '2K昂莱兔助手'.
    Implements:
      1. HMAC-SHA256 request signing (X-Sign, X-Timestamp)
      2. X25519 Ephemeral key exchange
      3. HKDF-SHA256 key derivation with context info
      4. AES-256-GCM authenticated payload decryption
    """

    def __init__(self, base_url: str = UPSTREAM_BASE_URL, secret_key: str = SECRET_KEY):
        self.base_url = base_url.rstrip("/")
        self.secret_key = secret_key
        self.salt_context = b"2k-player-data/api-response/v1\x01"

    def _generate_sign(self) -> Dict[str, str]:
        ts = str(int(time.time()))
        sign = hmac.new(
            self.secret_key.encode("utf-8"),
            ts.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        return {"timestamp": ts, "sign": sign}

    def _create_keypair(self):
        priv_key = x25519.X25519PrivateKey.generate()
        pub_key = priv_key.public_key()
        pub_bytes = pub_key.public_bytes(Encoding.Raw, PublicFormat.Raw)
        pub_b64url = base64.urlsafe_b64encode(pub_bytes).decode("utf-8").rstrip("=")
        return priv_key, pub_b64url

    def _decrypt_payload(self, body_json: Dict[str, Any], priv_key: x25519.X25519PrivateKey) -> Dict[str, Any]:
        try:
            # 1. Ephemeral public key
            server_epk = base64.urlsafe_b64decode(body_json["epk"] + "==")
            server_pub = x25519.X25519PublicKey.from_public_bytes(server_epk)

            # 2. X25519 Shared Secret
            shared_secret = priv_key.exchange(server_pub)

            # 3. HKDF-SHA256 derivation
            prk = hmac.new(b"\x00" * 32, shared_secret, hashlib.sha256).digest()
            aes_key = hmac.new(prk, self.salt_context, hashlib.sha256).digest()

            # 4. Extract parameters
            nonce = base64.urlsafe_b64decode(body_json["nonce"] + "==")
            ciphertext = base64.urlsafe_b64decode(body_json["ciphertext"] + "==")
            tag = base64.urlsafe_b64decode(body_json["tag"] + "==")
            aad = base64.urlsafe_b64decode(body_json["aad"] + "==")

            # 5. AES-256-GCM Decrypt
            aesgcm = AESGCM(aes_key)
            decrypted_bytes = aesgcm.decrypt(nonce, ciphertext + tag, aad)
            return json.loads(decrypted_bytes.decode("utf-8"))
        except Exception as e:
            raise CryptoProtocolError(f"Payload decryption failed: {str(e)}") from e

    def request(self, endpoint: str, params: Optional[Dict[str, Any]] = None, method: str = "GET", data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executes a secure API request to upstream, handling handshake and decryption.
        """
        sign_info = self._generate_sign()
        priv_key, client_pub_b64 = self._create_keypair()
        req_id = f"mp:{int(time.time() * 1000):x}:1"

        # Build query parameters
        query_dict = {"appname": APPNAME}
        if params:
            query_dict.update({k: v for k, v in params.items() if v is not None})
        
        query_str = urllib.parse.urlencode(query_dict)
        clean_endpoint = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        full_url = f"{self.base_url}{clean_endpoint}?{query_str}"

        headers = {
            "User-Agent": USER_AGENT,
            "X-Timestamp": sign_info["timestamp"],
            "X-Sign": sign_info["sign"],
            "X-Crypto-Version": "1",
            "X-Client-Public-Key": client_pub_b64,
            "X-Request-Id": req_id,
            "Content-Type": "application/json",
            "Accept": "*/*"
        }

        body_bytes = json.dumps(data).encode("utf-8") if data else None
        req = urllib.request.Request(full_url, data=body_bytes, headers=headers, method=method.upper())

        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
                content_type = response.headers.get("Content-Type", "")
                raw_body = response.read().decode("utf-8")

                # If encrypted payload
                if "application/vnd.2k-player-data.encrypted+json" in content_type or '"alg":"X25519' in raw_body:
                    envelope = json.loads(raw_body)
                    return self._decrypt_payload(envelope, priv_key)
                
                # If plain JSON response
                return json.loads(raw_body)
        except urllib.error.HTTPError as e:
            err_content = e.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"Upstream HTTP {e.code}: {err_content}") from e
        except Exception as e:
            raise RuntimeError(f"Upstream network request error: {str(e)}") from e


# Singleton instance
default_client = UpstreamClient()

