import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Building2,
  Cat,
  HeartPulse,
  MessagesSquare,
  Package,
  Sparkles,
  Stethoscope,
  Star,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { type AppNotificationDto, useNotificationStore } from "../../store/useNotificationStore";
import { useThreadNotifications } from "../../notifications/ThreadNotificationContext";

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function resolveIconKey(n: AppNotificationDto): string {
  const raw = (n.iconKind || n.kind || "system").toLowerCase();
  if (raw.includes("vet") || raw === "vet_license_verified" || raw === "vet_new_review" || raw === "pawvet_new_triage_case")
    return "vet";
  if (
    raw.includes("shelter") ||
    raw === "shelter_verified" ||
    raw === "adoption_inquiry" ||
    raw === "adoption_listing_published" ||
    raw === "adoption_inquiry_submitted" ||
    raw === "shelter_application_rejected"
  )
    return "shelter";
  if (raw.includes("message") || raw === "new_message") return "message";
  if (raw.includes("market") || raw.includes("order") || raw.includes("package") || raw.includes("listing_removed"))
    return "package";
  if (raw.includes("health")) return "health";
  if (raw.includes("forum") || raw.includes("score") || raw === "forum_comment_reply") return "forum";
  if (raw.includes("star") || raw.includes("review")) return "star";
  if (raw.includes("system")) return "system";
  if (raw.includes("urgent")) return "urgent";
  return raw;
}

function KindIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const cn = className ?? "";
  const kind = iconKey.toLowerCase();
  switch (kind) {
    case "urgent":
      return <AlertTriangle className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "vet":
      return <Stethoscope className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "shelter":
      return <Building2 className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "message":
      return <MessagesSquare className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "market":
    case "package":
      return <Package className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "health":
      return <HeartPulse className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "forum":
      return <MessagesSquare className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "star":
      return <Star className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "system":
      return <Sparkles className={cn} size={20} strokeWidth={2} aria-hidden />;
    default:
      return <Bell className={cn} size={20} strokeWidth={2} aria-hidden />;
  }
}

function NotificationRow({
  n,
  onNavigate,
}: {
  n: AppNotificationDto;
  onNavigate: (path: string) => void;
}) {
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  const go = () => {
    void (async () => {
      try {
        await markAsRead(n.id);
      } catch {
        /* still navigate */
      }
      onNavigate(n.deepLink.startsWith("/") ? n.deepLink : `/${n.deepLink}`);
    })();
  };

  const clear = async (e?: SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await removeNotification(n.id);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="ph-notif-swipe-wrap">
      <div className="ph-notif-swipe-delete-bg" aria-hidden>
        <span className="ph-notif-swipe-delete-label">Clear</span>
      </div>
      <motion.div
        className={
          "ph-notif-swipe-front ph-notif-drawer-item" + (n.read ? "" : " ph-notif-drawer-item--unread")
        }
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -96, right: 0 }}
        dragElastic={0.07}
        onDragEnd={(_, info) => {
          if (info.offset.x < -52 || info.velocity.x < -420) {
            void clear();
          }
        }}
      >
        <button type="button" className="ph-notif-swipe-main" onClick={go}>
          <div className="ph-notif-drawer-avatar-wrap">
            {n.avatarUrl ? (
              <img src={n.avatarUrl} alt="" className="ph-notif-drawer-avatar" />
            ) : (
              <span className="ph-notif-drawer-icon-ring">
                <KindIcon iconKey={resolveIconKey(n)} className="ph-notif-drawer-icon" />
              </span>
            )}
            {!n.read ? <span className="ph-notif-drawer-unread-dot" aria-hidden /> : null}
          </div>
          <div className="ph-notif-drawer-item-body">
            <div className="ph-notif-drawer-item-top">
              <span className="ph-notif-drawer-item-title">{n.title}</span>
              <time className="ph-notif-drawer-item-time" dateTime={n.createdAt}>
                {timeAgo(n.createdAt)}
              </time>
            </div>
            <p className="ph-notif-drawer-item-preview">{n.body}</p>
          </div>
        </button>
        <button
          type="button"
          className="ph-notif-dismiss"
          aria-label="Remove notification"
          title="Remove"
          onClick={(e) => void clear(e)}
        >
          <X size={18} strokeWidth={2.25} aria-hidden />
        </button>
      </motion.div>
    </div>
  );
}

export type NotificationDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const navigate = useNavigate();
  const items = useNotificationStore((s) => s.items);
  const loading = useNotificationStore((s) => s.loading);
  const error = useNotificationStore((s) => s.error);
  const refreshItems = useNotificationStore((s) => s.refreshItems);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const { threads } = useThreadNotifications();

  useEffect(() => {
    if (open) {
      void refreshItems();
    }
  }, [open, refreshItems]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items],
  );
  const unreadThreads = useMemo(() => threads.filter((t) => t.unread === true).slice(0, 6), [threads]);

  const onNavigate = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const empty = sorted.length === 0 && unreadThreads.length === 0;

  const node = (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            key="notif-backdrop"
            className="ph-notif-drawer-backdrop"
            aria-label="Close notifications"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            key="notif-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ph-notif-drawer-title"
            className="ph-notif-drawer-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="ph-notif-drawer-head">
              <div>
                <h2 id="ph-notif-drawer-title" className="ph-notif-drawer-title">
                  Notifications
                </h2>
                <p className="ph-notif-drawer-sub">Updates for your PawHub activity</p>
              </div>
              <button
                type="button"
                className="ph-notif-drawer-markall"
                disabled={sorted.length === 0 || sorted.every((n) => n.read)}
                onClick={() => void markAllAsRead()}
              >
                Mark all read
              </button>
            </header>

            <div className="ph-notif-drawer-scroll">
              {error && open ? <p className="ph-notif-drawer-err">{error}</p> : null}
              {loading && sorted.length === 0 ? (
                <p className="ph-notif-drawer-loading" role="status">
                  Loading…
                </p>
              ) : null}
              {empty ? (
                <div className="ph-notif-drawer-empty">
                  <div className="ph-notif-drawer-empty-icon" aria-hidden>
                    <Cat size={52} strokeWidth={1.35} />
                  </div>
                  <p className="ph-notif-drawer-empty-title">No new alerts</p>
                  <p className="ph-notif-drawer-empty-text">Your cat is happy!</p>
                </div>
              ) : (
                <>
                  {sorted.length > 0 ? (
                    <div className="ph-notif-drawer-section">
                      <h3 className="ph-notif-drawer-section-label">Activity</h3>
                      <div className="ph-notif-drawer-list">
                        {sorted.map((n) => (
                          <NotificationRow key={n.id} n={n} onNavigate={onNavigate} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {unreadThreads.length > 0 ? (
                    <div className="ph-notif-drawer-section">
                      <h3 className="ph-notif-drawer-section-label">Messages</h3>
                      <ul className="ph-notif-drawer-msgs">
                        {unreadThreads.map((t) => (
                          <li key={t.id}>
                            <Link
                              className="ph-notif-drawer-msg"
                              to={`/messages/${t.id}`}
                              onClick={() => onClose()}
                            >
                              <span className="ph-notif-drawer-msg-avatar">
                                {t.otherAvatarUrl ? (
                                  <img src={t.otherAvatarUrl} alt="" />
                                ) : (
                                  <span>{t.otherDisplayName.slice(0, 1).toUpperCase()}</span>
                                )}
                                <span className="ph-notif-drawer-unread-dot" aria-hidden />
                              </span>
                              <span className="ph-notif-drawer-msg-body">
                                <span className="ph-notif-drawer-msg-name">{t.otherDisplayName}</span>
                                <span className="ph-notif-drawer-msg-preview">
                                  {t.lastMessagePreview || "New message"}
                                </span>
                              </span>
                              <span className="ph-notif-drawer-item-time">
                                {t.lastMessageAt ? timeAgo(t.lastMessageAt) : "—"}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <footer className="ph-notif-drawer-foot">
              <Link to="/messages" className="ph-notif-drawer-foot-link" onClick={() => onClose()}>
                Open messaging
              </Link>
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(node, document.body) : null;
}
