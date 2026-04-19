import * as Dialog from "@radix-ui/react-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
};

/** Same Radix + hub-dialog styling as “New forum” / command palette. */
export function HubConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="hub-dialog-overlay" />
        <Dialog.Content
          className="hub-dialog-content"
          style={{ top: "15%", maxWidth: 420, width: "min(100% - 2rem, 420px)" }}
          aria-describedby={description ? "hub-confirm-desc" : undefined}
        >
          <Dialog.Title style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-border)", margin: 0, fontFamily: "var(--font-display)" }}>
            {title}
          </Dialog.Title>
          <div style={{ padding: "1rem" }}>
            {description ? (
              <p id="hub-confirm-desc" style={{ margin: "0 0 1rem", color: "var(--color-muted)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                {description}
              </p>
            ) : null}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" className="ph-btn ph-btn-ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={danger ? "ph-btn ph-btn-primary" : "ph-btn ph-btn-primary"}
                style={danger ? { background: "#b42318", borderColor: "#b42318" } : undefined}
                onClick={() => void Promise.resolve(onConfirm()).then(() => onOpenChange(false))}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
