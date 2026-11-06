import { useEffect, useState } from "react";
import { Copy, DownloadSimple, WarningCircle, X } from "@phosphor-icons/react";
import type { PlayerDetail } from "../data/types";
import { renderShareCard, shareUrlFor } from "../lib/shareCard";
import { copyText } from "../lib/clipboard";
import { pushToast } from "../state/store";

interface ShareCardModalProps {
  open: boolean;
  detail: PlayerDetail | null;
  onClose: () => void;
}

export function ShareCardModal({ open, detail, onClose }: ShareCardModalProps) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !detail) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setImage(null);
    renderShareCard(detail)
      .then((canvas) => {
        if (alive) setImage(canvas.toDataURL("image/png"));
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "生成分享卡片失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, detail]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || !detail) return null;

  const url = shareUrlFor(detail);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="球员分享卡片"
      onClick={onClose}
    >
      <div className="modal share-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__head">
          <div>
            <div className="modal__title">球员分享卡片</div>
            <div className="share-modal__sub">含球员数据、站点链接与二维码</div>
          </div>
          <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}>
            <X size={15} weight="bold" />
          </button>
        </div>

        <div className="share-modal__body">
          {loading ? (
            <div className="skeleton share-modal__skeleton" />
          ) : error ? (
            <div className="share-modal__error">
              <WarningCircle size={20} />
              <div>
                <div className="share-modal__error-title">卡片生成失败</div>
                <p>{error}</p>
              </div>
            </div>
          ) : image ? (
            <img className="share-card-preview" src={image} alt={`${detail.name} 分享卡片`} />
          ) : null}
        </div>

        <div className="share-modal__url">{url}</div>

        <div className="share-modal__actions">
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const ok = await copyText(url);
              pushToast(ok ? "链接已复制" : "复制失败，请手动复制", ok ? "accent" : "danger");
            }}
          >
            <Copy size={14} />
            复制链接
          </button>
          <a
            className={image ? "btn btn--primary" : "btn btn--primary is-disabled"}
            href={image ?? undefined}
            download={`COURTSIDE-${detail.name}.png`}
            onClick={(event) => {
              if (!image) event.preventDefault();
            }}
          >
            <DownloadSimple size={14} weight="bold" />
            下载图片
          </a>
        </div>
      </div>
    </div>
  );
}
