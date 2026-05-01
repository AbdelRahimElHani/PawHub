import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AppNotificationDto } from "../../store/useNotificationStore";
import { isModerationDetailKind, moderationNoticeLabel } from "./moderationKinds";

type Props = {
  n: AppNotificationDto | null;
  onClose: () => void;
};

export function ModerationNoticeDialog({ n, onClose }: Props) {
  const navigate = useNavigate();
  const open = Boolean(n && isModerationDetailKind(n.kind));

  function goLink() {
    if (!n) return;
    const d = n.deepLink?.trim();
    const path = d ? (d.startsWith("/") ? d : `/${d}`) : "/";
    navigate(path);
    onClose();
  }

  if (!n) return null;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="hub-dialog-overlay" />
        <Dialog.Content
          className="hub-dialog-content"
          style={{ top: "10%", maxWidth: 480, width: "min(100% - 2rem, 480px)" }}
          aria-describedby="mod-notice-desc"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#b42318",
                  marginBottom: "0.35rem",
                }}
              >
                {moderationNoticeLabel(n.kind)}
              </span>
              <Dialog.Title style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
                {n.title}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ph-btn ph-btn-ghost" aria-label="Close">
                <X size={20} strokeWidth={2.25} aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p
              id="mod-notice-desc"
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontSize: "0.92rem",
                lineHeight: 1.55,
                color: "var(--color-text)",
              }}
            >
              {n.body || "No additional details were stored with this notice."}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="ph-btn ph-btn-ghost" onClick={onClose}>
                Close
              </button>
              <button type="button" className="ph-btn ph-btn-primary" onClick={() => void goLink()}>
                Open related page
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
