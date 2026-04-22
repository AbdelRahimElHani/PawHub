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
import { createStompClient, sendChatTyping } from "./stomp";

export type ChatInboxPayload = { type: "MESSAGE"; threadId: number; message: MessageDto };

export type ActiveThreadHandlers = {
  onMessage: (rawBody: string) => void;
  onTyping: (rawBody: string) => void;
};

type ChatStompContextValue = {
  /** Re-subscribe when opening a thread; pass null to clear. */
  setActiveThread: (threadId: number | null, opts: ActiveThreadHandlers | null) => void;
  sendTyping: (threadId: number, typing: boolean) => void;
  registerInbox: (cb: (p: ChatInboxPayload) => void) => () => void;
  connected: boolean;
};

const ChatStompContext = createContext<ChatStompContextValue | null>(null);

const noopHandlers: ActiveThreadHandlers = {
  onMessage: () => {},
  onTyping: () => {},
};

export function ChatStompProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const clientRef = useRef<Client | null>(null);
  const inboxSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const threadSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const typingSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const activeThreadIdRef = useRef<number | null>(null);
  const threadHandlersRef = useRef<ActiveThreadHandlers>(noopHandlers);
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

  useEffect(() => {
    if (!token) {
      setConnected(false);
      clearThreadSubscriptions();
      inboxSubRef.current?.unsubscribe();
      inboxSubRef.current = null;
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
            const j = JSON.parse(message.body) as { type?: string; threadId?: number; message?: MessageDto };
            if (j.type === "MESSAGE" && j.message && j.threadId != null) {
              const p: ChatInboxPayload = { type: "MESSAGE", threadId: j.threadId, message: j.message };
              inboxListenersRef.current.forEach((fn) => fn(p));
            }
          } catch (e) {
            console.error("PawHub inbox event parse", e);
          }
        });
        attachThreadSubscriptions(c);
      },
      () => {
        setConnected(false);
        inboxSubRef.current = null;
        threadSubRef.current = null;
        typingSubRef.current = null;
      },
    );
    clientRef.current = client;
    client.activate();
    return () => {
      setConnected(false);
      clearThreadSubscriptions();
      inboxSubRef.current?.unsubscribe();
      inboxSubRef.current = null;
      client.deactivate();
      clientRef.current = null;
    };
  }, [token, attachThreadSubscriptions, clearThreadSubscriptions]);

  const value: ChatStompContextValue = {
    setActiveThread,
    sendTyping,
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
