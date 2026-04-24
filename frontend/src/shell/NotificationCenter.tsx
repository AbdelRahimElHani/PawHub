import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { NotificationDrawer } from "../components/notifications/NotificationDrawer";
import { useThreadNotifications } from "../notifications/ThreadNotificationContext";
import { useNotificationStore } from "../store/useNotificationStore";

export function NotificationCenter() {
  const { anyUnreadCount, threads } = useThreadNotifications();
  const appUnread = useNotificationStore((s) => s.appUnread);
  const refreshUnread = useNotificationStore((s) => s.refreshUnread);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const badge = useMemo(() => appUnread + anyUnreadCount, [appUnread, anyUnreadCount]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    void refreshUnread();
  }, [threads, refreshUnread]);

  const toggle = useCallback(() => setDrawerOpen((o) => !o), []);

  return (
    <div className="ph-notif-center">
      <button
        type="button"
        className="ph-notif-bell"
        aria-expanded={drawerOpen}
        aria-haspopup="dialog"
        aria-label={badge > 0 ? `Notifications, ${badge} unread` : "Notifications"}
        title="Notifications"
        onClick={toggle}
      >
        <Bell size={20} strokeWidth={2.25} aria-hidden />
        {badge > 0 ? <span className="ph-notif-bell-badge">{badge > 99 ? "99+" : badge}</span> : null}
      </button>
      <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
