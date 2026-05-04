import { create } from "zustand";
import { api } from "../api/client";

/**
 * When two fetches overlap (e.g. STOMP refresh finishes first, then a slower `refreshItems`
 * returns), the slower response can omit a brand-new row. Keep client rows that are newer than
 * the incoming snapshot (monotonic ids) so toasts and the list stay correct.
 */
function mergeNotificationSnapshots(
  prev: AppNotificationDto[] | undefined,
  incoming: AppNotificationDto[],
): AppNotificationDto[] {
  if (incoming.length === 0) {
    return prev?.slice() ?? [];
  }
  const incomingIds = new Set(incoming.map((x) => x.id));
  const maxIncomingId = Math.max(...incoming.map((x) => x.id));
  const prevArr = prev ?? [];
  const extras = prevArr.filter((x) => !incomingIds.has(x.id) && x.id > maxIncomingId);
  if (extras.length === 0) {
    return incoming.slice();
  }
  return [...incoming, ...extras].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Mirrors backend `AppNotificationDto`. */
export type AppNotificationDto = {
  id: number;
  kind: string;
  title: string;
  body: string;
  read: boolean;
  deepLink: string;
  iconKind: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

type UnreadCountResponse = { count: number };

type NotificationStore = {
  items: AppNotificationDto[];
  appUnread: number;
  loading: boolean;
  error: string | null;
  /** Load list (drawer) + refresh unread badge. */
  refreshAll: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  /** Returns the notification rows applied from this fetch (for toast “seen” seeding). */
  refreshItems: () => Promise<AppNotificationDto[]>;
  /** Same as refreshItems but does not flip `loading` (for STOMP / background refresh). Returns HTTP rows. */
  refreshItemsSilent: () => Promise<AppNotificationDto[]>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: number) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  items: [],
  appUnread: 0,
  loading: false,
  error: null,

  refreshUnread: async () => {
    try {
      const j = await api<UnreadCountResponse>("/api/notifications/unread-count");
      set({ appUnread: typeof j.count === "number" ? j.count : 0, error: null });
    } catch {
      set({ appUnread: 0 });
    }
  },

  refreshItems: async () => {
    set({ loading: true, error: null });
    try {
      const rows = await api<AppNotificationDto[]>("/api/notifications?limit=80");
      const list = Array.isArray(rows) ? rows : [];
      set((s) => {
        const merged = mergeNotificationSnapshots(s.items, list);
        return { items: merged, loading: false, appUnread: merged.filter((n) => !n.read).length };
      });
      return list;
    } catch (e: unknown) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Could not load notifications",
        items: [],
      });
      return [];
    }
  },

  refreshItemsSilent: async () => {
    try {
      const rows = await api<AppNotificationDto[]>("/api/notifications?limit=80");
      if (!Array.isArray(rows)) {
        return [];
      }
      set((s) => {
        const merged = mergeNotificationSnapshots(s.items, rows);
        return { items: merged, error: null, appUnread: merged.filter((n) => !n.read).length };
      });
      return rows;
    } catch {
      await get().refreshUnread();
      return [];
    }
  },

  refreshAll: async () => {
    await get().refreshItems();
    await get().refreshUnread();
  },

  markAsRead: async (id: number) => {
    await api(`/api/notifications/${id}/read`, { method: "POST" });
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
    await get().refreshUnread();
  },

  markAllAsRead: async () => {
    await api("/api/notifications/read-all", { method: "POST" });
    set((s) => ({
      items: s.items.map((n) => ({ ...n, read: true })),
      appUnread: 0,
    }));
    await get().refreshUnread();
  },

  removeNotification: async (id: number) => {
    await api(`/api/notifications/${id}`, { method: "DELETE" });
    set((s) => {
      const items = s.items.filter((n) => n.id !== id);
      return { items, appUnread: items.filter((n) => !n.read).length };
    });
    await get().refreshUnread();
  },

  clearAllNotifications: async () => {
    await api("/api/notifications", { method: "DELETE" });
    set({ items: [], appUnread: 0 });
    await get().refreshUnread();
  },
}));
