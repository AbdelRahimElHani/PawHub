import * as Dialog from "@radix-ui/react-dialog";
import { FormEvent, useState } from "react";
import { api } from "../api/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: number;
  onRemoved: () => void | Promise<void>;
};

export function AdminAdoptRemoveDialog({ open, onOpenChange, listingId, onRemoved }: Props) {
  const [reason, setReason] = useState("");
  const [warnShelter, setWarnShelter] = useState(false);
  const [banShelter, setBanShelter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api(`/api/admin/adopt/listings/${listingId}`, {
        method: "DELETE",
        body: JSON.stringify({
          reason: reason.trim() || null,
          warnShelter,
          banShelter,
        }),
      });
      await Promise.resolve(onRemoved());
      onOpenChange(false);
      setReason("");
      setWarnShelter(false);
      setBanShelter(false);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="hub-dialog-overlay" />
        <Dialog.Content
          className="hub-dialog-content"
          style={{ top: "12%", maxWidth: 440, width: "min(100% - 2rem, 440px)" }}
          aria-describedby="admin-remove-adopt-desc"
        >
          <Dialog.Title
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--color-border)",
              margin: 0,
              fontFamily: "var(--font-display)",
            }}
          >
            Remove adoption listing
          </Dialog.Title>
          <form onSubmit={(e) => void submit(e)} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <p id="admin-remove-adopt-desc" style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              The shelter owner is notified with your reason. Related inquiry threads get a moderation message. Optional: send a formal Paw Adopt warning and/or ban the shelter from publishing adoption listings.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span className="ph-label">Reason (shown to shelter)</span>
              <textarea
                className="ph-input"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Misleading description, policy violation…"
                maxLength={2000}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem", cursor: "pointer" }}>
              <input type="checkbox" checked={warnShelter} onChange={(e) => setWarnShelter(e.target.checked)} />
              Send Paw Adopt warning notification
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem", cursor: "pointer" }}>
              <input type="checkbox" checked={banShelter} onChange={(e) => setBanShelter(e.target.checked)} />
              Ban shelter from Paw Adopt listings
            </label>
            {err ? <p style={{ margin: 0, color: "#b42318", fontSize: "0.88rem" }}>{err}</p> : null}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" className="ph-btn ph-btn-ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </button>
              <button
                type="submit"
                className="ph-btn ph-btn-primary"
                style={{ background: "#b42318", borderColor: "#b42318" }}
                disabled={busy}
              >
                {busy ? "Removing…" : "Remove listing"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
