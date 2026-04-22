import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useThreadNotifications } from "../notifications/ThreadNotificationContext";

export function NotificationCenter() {
  const { threads, anyUnreadCount } = useThreadNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const unreadThreads = threads.filter((t) => t.unread === true).slice(0, 8);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    },
    [setOpen],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onKey]);

  return (
    <div className="ph-notif-center" ref={rootRef}>
      <button
        type="button"
        className="ph-notif-bell"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={anyUnreadCount > 0 ? `Notifications, ${anyUnreadCount} unread` : "Notifications"}
        title="Messages & notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} strokeWidth={2.25} aria-hidden />
        {anyUnreadCount > 0 ? (
          <span className="ph-notif-bell-badge">{anyUnreadCount > 9 ? "9+" : anyUnreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <div className="ph-notif-pop" role="menu" aria-label="Message notifications">
          <div className="ph-notif-pop-head">
            <span>Messages</span>
            {anyUnreadCount > 0 ? <span className="ph-notif-pop-sub">{anyUnreadCount} unread</span> : null}
          </div>
          {unreadThreads.length === 0 ? (
            <p className="ph-notif-empty">No new messages. You’re all caught up.</p>
          ) : (
            <ul className="ph-notif-list">
              {unreadThreads.map((t) => (
                <li key={t.id}>
                  <Link
                    className="ph-notif-item"
                    role="menuitem"
                    to={`/messages/${t.id}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="ph-notif-item-name">{t.otherDisplayName}</span>
                    <span className="ph-notif-item-preview">
                      {t.lastMessagePreview || "New message"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="ph-notif-pop-foot">
            <Link to="/messages" className="ph-notif-all" onClick={() => setOpen(false)}>
              Open messaging
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
