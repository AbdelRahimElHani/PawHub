import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { MessengerWorkspace } from "./MessengerWorkspace";

/**
 * LinkedIn-style tray: tab fixed at bottom-right; panel opens upward above the tab.
 */
export function MessagingDock() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);

  const onSelectThread = useCallback((id: number) => {
    setActiveThreadId(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) return null;

  const tid = activeThreadId ?? NaN;

  return (
    <div className="ph-msg-dock-root" aria-label="Messaging">
      {open && (
        <div className="ph-msg-dock-panel" role="dialog" aria-modal="false">
          <MessengerWorkspace
            activeThreadId={tid}
            onSelectThread={onSelectThread}
            variant="dock"
            onNewDmThread={(id) => setActiveThreadId(id)}
            showFullPageLink
          />
        </div>
      )}

      <button
        type="button"
        className="ph-msg-dock-tab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="ph-msg-dock-tab-left">
          <MessageCircle size={20} strokeWidth={2} />
          <span>Messaging</span>
        </span>
        {open ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </button>
    </div>
  );
}
