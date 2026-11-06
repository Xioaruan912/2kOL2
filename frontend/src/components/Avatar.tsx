import { useState } from "react";
import { classNames } from "../lib/format";

interface AvatarProps {
  name: string;
  portrait?: string;
  size?: number;
  className?: string;
  alt?: string;
}

function initials(name: string): string {
  const segment = name.split(/[.·]/).filter(Boolean).pop() ?? name;
  return segment.slice(0, 1) || "·";
}

export function Avatar({ name, portrait, size = 40, className, alt }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = portrait && !failed;

  return (
    <div
      className={classNames("avatar", className)}
      style={{ width: size, height: Math.round(size * 1.18) }}
    >
      {showImage ? (
        <img
          src={portrait}
          alt={alt ?? `${name} 头像`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="avatar__fallback" style={{ fontSize: Math.round(size * 0.34) }}>
          {initials(name)}
        </span>
      )}
    </div>
  );
}
