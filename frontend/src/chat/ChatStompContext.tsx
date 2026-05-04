import { Client, type IMessage } from "@stomp/stompjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/AuthContext";
import type { MessageDto } from "../types";
import { type AppNotificationDto, useNotificationStore } from "../store/useNotificationStore";
import { emitAppNotificationToast } from "../notifications/appNotificationToastEvents";
import { createStompClient, sendChatTyping, sendTriageTyping as stompSendTriageTyping } from "./stomp";

export type ChatInboxPayload = { type: "MESSAGE"; threadId: number; message: MessageDto };

type AppNotificationPushPayload = {
  type?: string;
  notificationId?: unknown;
  notification?: unknown;
};

function isAppNotificationDto(value: unknown): value is AppNotificationDto {
  if (!value || typeof value !== "object") return false;
  const n = value as Partial<AppNotificationDto>;
  return (
    typeof n.id === "number" &&
    typeof n.kind === "string" &&
    typeof n.title === "string" &&
    typeof n.body === "string" &&
    typeof n.read === "boolean" &&
    typeof n.deepLink === "string" &&
    typeof n.createdAt === "string"
  );
}

function parseAppNotificationPush(body: string): { notificationId: number | null; notification: AppNotificationDto | null } {
  try {
    const payload = JSON.parse(body) as AppNotificationPushPayload;
    const notification = isAppNotificationDto(payload.notification) ? payload.notification : null;
    const rawId = notification?.id ?? payload.notificationId;
    const notificationId = typeof rawId === "number" && Number.isFinite(rawId) ? rawId : null;
    return { notificationId, notification };
  } catch {
    return { notificationId: null, notification: null };
  }
}

export type ActiveThreadHandlers = {
  onMessage: (rawBody: string) => void;
  onTyping: (rawBody: string) => void;
};

export type ActiveTriageCaseHandlers = {
  onCaseUpdate: (rawBody: string) => void;
  onTyping: (rawBody: string) => void;
};

type ChatStompContextValue = {
  /** Re-subscribe when opening a thread; pass null to clear. */
  setActiveThread: (threadId: number | null, opts: ActiveThreadHandlers | null) => void;
  sendTyping: (threadId: number, typing: boolean) => void;
  /** PawVet triage case room — realtime messages + typing (same STOMP connection as messaging). */
  setActiveTriageCase: (caseId: number | null, opts: ActiveTriageCaseHandlers | null) => void;
  sendTriageTyping: (caseId: number, typing: boolean) => void;
  registerInbox: (cb: (p: ChatInboxPayload) => void) => () => void;
  connected: boolean;
};

const ChatStompContext = createContext<ChatStompContextValue | null>(null);

const noopHandlers: ActiveThreadHandlers = {
  onMessage: () => {},
  onTyping: () => {},
};

const noopTriageHandlers: ActiveTriageCaseHandlers = {
  onCaseUpdate: () => {},
  onTyping: () => {},
};

export function ChatStompProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const clientRef = useRef<Client | null>(null);
  const inboxSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const appNotifSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const threadSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const typingSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const triageSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const triageTypingSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const activeThreadIdRef = useRef<number | null>(null);
  const threadHandlersRef = useRef<ActiveThreadHandlers>(noopHandlers);
  const activeTriageCaseIdRef = useRef<number | null>(null);
  const triageHandlersRef = useRef<ActiveTriageCaseHandlers>(noopTriageHandlers);
  const inboxListenersRef = useRef<Set<(p: ChatInboxPayload) => void>>(new Set());
  const [connected, setConnected] = useState(false);

  const registerInbox = useCallback((cb: (p: ChatInboxPayload) => void) => {
    inboxListenersRef.current.add(cb);
    return () => {
      inboxListenersRef.current.delete(cb);
    };
  }, []);

  const clearThreadSubscriptions = useCallback(() => {
    threadSubRef.current?.unsubscribe();
    threadSubRef.current = null;
    typingSubRef.current?.unsubscribe();
    typingSubRef.current = null;
  }, []);

  const clearTriageSubscriptions = useCallback(() => {
    triageSubRef.current?.unsubscribe();
    triageSubRef.current = null;
    triageTypingSubRef.current?.unsubscribe();
    triageTypingSubRef.current = null;
  }, []);

  const attachThreadSubscriptions = useCallback((c: Client) => {
    clearThreadSubscriptions();
    const tid = activeThreadIdRef.current;
    if (tid == null || !Number.isFinite(tid) || tid <= 0) {
      return;
    }
    const h = threadHandlersRef.current;
    threadSubRef.current = c.subscribe(`/topic/threads.${tid}`, (msg: IMessage) => h.onMessage(msg.body));
    typingSubRef.current = c.subscribe(`/topic/threads.${tid}.typing`, (msg: IMessage) => h.onTyping(msg.body));
  }, [clearThreadSubscriptions]);

  const attachTriageSubscriptions = useCallback(
    (c: Client) => {
      clearTriageSubscriptions();
      const cid = activeTriageCaseIdRef.current;
      if (cid == null || !Number.isFinite(cid) || cid <= 0) {
        return;
      }
      const h = triageHandlersRef.current;
      triageSubRef.current = c.subscribe(`/topic/pawvet.triage.${cid}`, (msg: IMessage) => h.onCaseUpdate(msg.body));
      triageTypingSubRef.current = c.subscribe(`/topic/pawvet.triage.${cid}.typing`, (msg: IMessage) =>
        h.onTyping(msg.body),
      );
    },
    [clearTriageSubscriptions],
  );

  const setActiveThread = useCallback(
    (threadId: number | null, opts: ActiveThreadHandlers | null) => {
      activeThreadIdRef.current = threadId;
      threadHandlersRef.current = opts ?? noopHandlers;
      const c = clientRef.current;
      if (c?.connected) {
        attachThreadSubscriptions(c);
      } else {
        clearThreadSubscriptions();
      }
    },
    [attachThreadSubscriptions, clearThreadSubscriptions],
  );

  const sendTyping = useCallback((threadId: number, typing: boolean) => {
    const c = clientRef.current;
    if (c) {
      sendChatTyping(c, threadId, typing);
    }
  }, []);

  const setActiveTriageCase = useCallback(
    (caseId: number | null, opts: ActiveTriageCaseHandlers | null) => {
      activeTriageCaseIdRef.current = caseId;
      triageHandlersRef.current = opts ?? noopTriageHandlers;
      const c = clientRef.current;
      if (c?.connected) {
        attachTriageSubscriptions(c);
      } else {
        clearTriageSubscriptions();
      }
    },
    [attachTriageSubscriptions, clearTriageSubscriptions],
  );

  const sendTriageTyping = useCallback((caseId: number, typing: boolean) => {
    const c = clientRef.current;
    if (c) {
      stompSendTriageTyping(c, caseId, typing);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      clearThreadSubscriptions();
      clearTriageSubscriptions();
      inboxSubRef.current?.unsubscribe();
      inboxSubRef.current = null;
      appNotifSubRef.current?.unsubscribe();
      appNotifSubRef.current = null;
      clientRef.current?.deactivate();
      clientRef.current = null;
      return;
    }

    const client = createStompClient(
      token,
      (c) => {
        clientRef.current = c;
        setConnected(true);
        inboxSubRef.current = c.subscribe("/user/queue/pawhub-chat", (message: IMessage) => {
          try {
            const j = JSON.parse(message.body) as { type?: string; threadId?: unknown; message?: MessageDto };
            if (j.type !== "MESSAGE" || !j.message || j.threadId == null) {
              return;
            }
            const threadId = Number(j.threadId);
            if (!Number.isFinite(threadId) || threadId <= 0) {
              return;
            }
            const p: ChatInboxPayload = { type: "MESSAGE", threadId, message: j.message };
            inboxListenersRef.current.forEach((fn) => fn(p));
          } catch (e) {
            console.error("PawHub inbox event parse", e);
          }
        });
        appNotifSubRef.current = c.subscribe("/user/queue/pawhub-app-notifications", (message: IMessage) => {
          const pushed = parseAppNotificationPush(message.body);
          void useNotificationStore
            .getState()
            .refreshItemsSilent()
            .then((rows) => {
              const exact =
                pushed.notificationId == null ? null : rows.find((n) => n.id === pushed.notificationId) ?? null;
              const notification = exact ?? pushed.notification;
              if (notification) {
                emitAppNotificationToast(notification);
              }
            });
        });
        attachThreadSubscriptions(c);
        attachTriageSubscriptions(c);
      },
      () => {
        setConnected(false);
        inboxSubRef.current = null;
        appNotifSubRef.current = null;
        threadSubRef.current = null;
        typingSubRef.current = null;
        triageSubRef.current = null;
        triageTypingSubRef.current = null;
      },
    );
    clientRef.current = client;
    client.activate();
    return () => {
      setConnected(false);
      clearThreadSubscriptions();
      clearTriageSubscriptions();
      inboxSubRef.current?.unsubscribe();
      inboxSubRef.current = null;
      appNotifSubRef.current?.unsubscribe();
      appNotifSubRef.current = null;
      client.deactivate();
      clientRef.current = null;
    };
  }, [token, attachThreadSubscriptions, attachTriageSubscriptions, clearThreadSubscriptions, clearTriageSubscriptions]);

  const value: ChatStompContextValue = {
    setActiveThread,
    sendTyping,
    setActiveTriageCase,
    sendTriageTyping,
    registerInbox,
    connected,
  };

  return <ChatStompContext.Provider value={value}>{children}</ChatStompContext.Provider>;
}

export function useChatStomp(): ChatStompContextValue {
  const v = useContext(ChatStompContext);
  if (!v) {
    throw new Error("useChatStomp must be used within ChatStompProvider");
  }
  return v;
}
