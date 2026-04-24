import { create } from "zustand";
import { api } from "../api/client";

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
  refreshItems: () => Promise<void>;
  /** Same as refreshItems but does not flip `loading` (for STOMP / background refresh). */
  refreshItemsSilent: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: number) => Promise<void>;
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
      set({ items: Array.isArray(rows) ? rows : [], loading: false });
      const unread = (Array.isArray(rows) ? rows : []).filter((n) => !n.read).length;
      set({ appUnread: unread });
    } catch (e: unknown) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Could not load notifications",
        items: [],
      });
    }
  },

  refreshItemsSilent: async () => {
    try {
      const rows = await api<AppNotificationDto[]>("/api/notifications?limit=80");
      if (!Array.isArray(rows)) return;
      set({ items: rows, error: null });
      set({ appUnread: rows.filter((n) => !n.read).length });
    } catch {
      await get().refreshUnread();
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
}));
