import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { MessengerWorkspace } from "./MessengerWorkspace";

/**
 * LinkedIn-style tray: tab fixed at bottom-right; panel opens upward above the tab.
 * The tab sits under the contact-list column only, not under the chat panel.
 */
export function MessagingDock() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);

  const onSelectThread = useCallback((id: number) => {
    setActiveThreadId(id);
  }, []);

  const onCloseDockChat = useCallback(() => {
    setActiveThreadId(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (activeThreadId != null) {
        setActiveThreadId(null);
      } else {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, activeThreadId]);

  if (!user) return null;

  const tid = activeThreadId ?? NaN;

  const tabButton = (
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
  );

  return (
    <div className="ph-msg-dock-root" aria-label="Messaging">
      <div className="ph-msg-dock-floating">
        {open ? (
          <MessengerWorkspace
            activeThreadId={tid}
            onSelectThread={onSelectThread}
            variant="dock"
            onNewDmThread={(id) => setActiveThreadId(id)}
            showFullPageLink
            onCloseDockChat={onCloseDockChat}
            dockTab={tabButton}
          />
        ) : (
          <div className="ph-msg-dock-col-list ph-msg-dock-col-list--tab-only">{tabButton}</div>
        )}
      </div>
    </div>
  );
}
