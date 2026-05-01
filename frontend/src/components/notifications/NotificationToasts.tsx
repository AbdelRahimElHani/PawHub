import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AppNotificationDto, useNotificationStore } from "../../store/useNotificationStore";
import { NotificationKindIcon, resolveNotificationIconKey } from "./notificationKindIcon";
import { isModerationDetailKind } from "./moderationKinds";
import { useModerationNotice } from "./ModerationNoticeContext";
import "./notif-toasts.css";

const TOAST_MS = 5000;
const MAX_TOASTS = 6;

type ToastEntry = { key: string; n: AppNotificationDto };

function toPath(n: AppNotificationDto): string | null {
  const d = n.deepLink?.trim();
  if (!d) return null;
  return d.startsWith("/") ? d : `/${d}`;
}

function SingleToast({
  n,
  entryKey,
  onAutoClose,
  onDismiss,
  onOpen,
}: {
  n: AppNotificationDto;
  entryKey: string;
  onAutoClose: (key: string) => void;
  onDismiss: (key: string) => void;
  onOpen: (n: AppNotificationDto, key: string) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onAutoClose(entryKey), TOAST_MS);
    return () => clearTimeout(t);
  }, [entryKey, onAutoClose]);

  return (
    <motion.div
      className="ph-notif-toast"
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
      layout
      role="status"
      aria-live="polite"
      style={{ ["--ph-notif-toast-ms" as string]: `${TOAST_MS}ms` }}
    >
      <div className="ph-notif-toast__row" style={{ alignItems: "stretch" }}>
        <button
          type="button"
          className="ph-notif-toast__main"
          onClick={() => onOpen(n, entryKey)}
        >
          <div className="ph-notif-toast__icon-ring" aria-hidden>
            {n.avatarUrl ? (
              <img
                src={n.avatarUrl}
                alt=""
                style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover" }}
              />
            ) : (
              <NotificationKindIcon className="ph-notif-toast-ico" iconKey={resolveNotificationIconKey(n)} />
            )}
          </div>
          <div className="ph-notif-toast__body">
            <p className="ph-notif-toast__title">{n.title}</p>
            {n.body ? <p className="ph-notif-toast__preview">{n.body}</p> : null}
          </div>
        </button>
        <button
          type="button"
          className="ph-notif-toast__close"
          aria-label="Dismiss"
          onClick={() => onDismiss(entryKey)}
        >
          <X size={18} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
      <div className="ph-notif-toast__bar-wrap" aria-hidden>
        <div className="ph-notif-toast__bar" />
      </div>
    </motion.div>
  );
}

export function NotificationToasts() {
  const items = useNotificationStore((s) => s.items);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const refreshItems = useNotificationStore((s) => s.refreshItems);
  const navigate = useNavigate();
  const { openModerationNotice } = useModerationNotice();
  const seen = useRef<Set<number>>(new Set());
  const [listReady, setListReady] = useState(false);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const remove = useCallback((key: string) => {
    setToasts((prev) => prev.filter((x) => x.key !== key));
  }, []);

  const push = useCallback((n: AppNotificationDto) => {
    const key = `${n.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => {
      const next = [...prev, { key, n }];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });
  }, []);

  const onOpen = useCallback(
    (n: AppNotificationDto, key: string) => {
      void (async () => {
        try {
          await markAsRead(n.id);
        } catch {
          /* still navigate */
        }
        if (isModerationDetailKind(n.kind)) {
          openModerationNotice(n);
          remove(key);
          return;
        }
        const path = toPath(n);
        if (path) {
          navigate(path);
        }
        remove(key);
      })();
    },
    [markAsRead, navigate, remove, openModerationNotice],
  );

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await refreshItems();
      } catch {
        /* keep going */
      } finally {
        if (!alive) return;
        for (const n of useNotificationStore.getState().items) {
          seen.current.add(n.id);
        }
        setListReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshItems]);

  useEffect(() => {
    if (!listReady) return;
    for (const n of items) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      push(n);
    }
  }, [items, listReady, push]);

  return (
    <div className="ph-notif-toast-stack" aria-label="New notifications">
      <AnimatePresence initial={false}>
        {toasts.map((e) => (
          <SingleToast
            key={e.key}
            n={e.n}
            entryKey={e.key}
            onAutoClose={remove}
            onDismiss={remove}
            onOpen={onOpen}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
