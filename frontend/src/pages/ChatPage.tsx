import { Client, type StompSubscription } from "@stomp/stompjs";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { createStompClient, sendChatMessage, subscribeThread } from "../chat/stomp";
import type { MessageDto } from "../types";

type Page<T> = { content: T[] };

export function ChatPage() {
  const { threadId } = useParams();
  const tid = Number(threadId);
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [body, setBody] = useState("");
  const clientRef = useRef<Client | null>(null);
  const subRef = useRef<StompSubscription | null>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  );

  useEffect(() => {
    if (!token || !tid) return;
    let cancelled = false;
    void (async () => {
      try {
        const page = await api<Page<MessageDto>>(`/api/chat/threads/${tid}/messages?page=0&size=100`);
        const rows = page?.content ?? [];
        if (!cancelled) setMessages([...rows].reverse());
      } catch (e) {
        console.error(e);
        if (!cancelled) setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tid, token]);

  useEffect(() => {
    if (!token || !tid) return;
    const client = createStompClient(
      token,
      (c) => {
        subRef.current?.unsubscribe();
        subRef.current = subscribeThread(c, tid, (raw) => {
          const dto = JSON.parse(raw) as MessageDto;
          setMessages((m) => [...m, dto]);
        });
      },
      () => {},
    );
    clientRef.current = client;
    client.activate();
    return () => {
      subRef.current?.unsubscribe();
      subRef.current = null;
      client.deactivate();
      clientRef.current = null;
    };
  }, [tid, token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const text = body.trim();
    setBody("");
    const c = clientRef.current;
    if (c?.connected) {
      sendChatMessage(c, tid, text);
    } else {
      const saved = await api<MessageDto>(`/api/chat/threads/${tid}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      });
      setMessages((m) => [...m, saved]);
    }
  }

  return (
    <div className="ph-surface" style={{ padding: "1rem", maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <h2 style={{ margin: 0 }}>Chat #{tid}</h2>
      <div className="ph-surface" style={{ padding: "0.75rem", minHeight: 280, maxHeight: 420, overflowY: "auto" }}>
        {sorted.map((m) => (
          <div key={m.id} style={{ marginBottom: "0.5rem", textAlign: m.senderId === user?.userId ? "right" : "left" }}>
            <div
              style={{
                display: "inline-block",
                padding: "0.45rem 0.65rem",
                borderRadius: 14,
                background: m.senderId === user?.userId ? "var(--color-accent-soft)" : "#eef6f4",
                maxWidth: "80%",
              }}
            >
              {m.body}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{new Date(m.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input className="ph-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Say something kind…" />
        <button className="ph-btn ph-btn-primary" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
