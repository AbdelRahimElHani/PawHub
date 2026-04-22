import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useChatStomp } from "../chat/ChatStompContext";
import type { ThreadSummaryDto } from "../types";

type ThreadNotificationContextValue = {
  threads: ThreadSummaryDto[];
  listingUnreadCount: number;
  anyUnreadCount: number;
  refresh: () => void;
};

const ThreadNotificationContext = createContext<ThreadNotificationContextValue | null>(null);

export function ThreadNotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { registerInbox } = useChatStomp();
  const [threads, setThreads] = useState<ThreadSummaryDto[]>([]);

  const refresh = useCallback(() => {
    if (!token) {
      setThreads([]);
      return;
    }
    void api<ThreadSummaryDto[]>("/api/chat/threads")
      .then(setThreads)
      .catch(() => setThreads([]));
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!token) return;
    return registerInbox(() => {
      refresh();
    });
  }, [token, registerInbox, refresh]);

  useEffect(() => {
    if (!token) return;
    const id = window.setInterval(refresh, 180_000);
    return () => clearInterval(id);
  }, [token, refresh]);

  useEffect(() => {
    function onFocus() {
      refresh();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const listingUnreadCount = useMemo(
    () => threads.filter((t) => t.marketListingId != null && t.unread === true).length,
    [threads],
  );
  const anyUnreadCount = useMemo(() => threads.filter((t) => t.unread === true).length, [threads]);

  const value = useMemo(
    () => ({ threads, listingUnreadCount, anyUnreadCount, refresh }),
    [threads, listingUnreadCount, anyUnreadCount, refresh],
  );

  return <ThreadNotificationContext.Provider value={value}>{children}</ThreadNotificationContext.Provider>;
}

export function useThreadNotifications(): ThreadNotificationContextValue {
  const ctx = useContext(ThreadNotificationContext);
  if (!ctx) {
    throw new Error("useThreadNotifications must be used within ThreadNotificationProvider");
  }
  return ctx;
}
