import { Client, type StompSubscription } from "@stomp/stompjs";
import { ImagePlus, MessagesSquare, MessageSquarePlus, Send, X } from "lucide-react";
import { CopyMessageButton } from "../components/CopyMessageButton";
import { type ReactNode, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useThreadNotifications } from "../notifications/ThreadNotificationContext";
import { createStompClient, subscribeThread } from "../chat/stomp";
import type { MessageDto, ThreadSummaryDto } from "../types";
import { ListingShareEmbed } from "./ListingShareEmbed";
import { parseListingShareFromMessage } from "./listingShareMessage";

type Page<T> = { content: T[] };

export type MessengerVariant = "page" | "dock";

export type MessengerWorkspaceProps = {
  activeThreadId: number;
  onSelectThread: (threadId: number) => void;
  variant: MessengerVariant;
  /** After POST /dm succeeds — e.g. navigate on full page */
  onNewDmThread?: (threadId: number) => void;
  /** Dock: link to open full /messages in new tab or same app */
  showFullPageLink?: boolean;
  /** Dock: close the floating chat pane (contact list stays open). */
  onCloseDockChat?: () => void;
  /** Dock: Messaging tab control — rendered below the contact list only, not under chat. */
  dockTab?: ReactNode;
};

function appendUnique(prev: MessageDto[], dto: MessageDto): MessageDto[] {
  if (prev.some((m) => m.id === dto.id)) return prev;
  return [...prev, dto];
}

/** Linkify non-listing https URLs in message text (listing URLs are stripped and shown as embed cards). */
const EXTERNAL_URL_RE = /(https?:\/\/[^\s]+)/g;

function MessageTextWithLinks({ text, mine }: { text: string; mine: boolean }) {
  if (!text) return null;
  const nodes: ReactNode[] = [];
  let last = 0;
  EXTERNAL_URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = EXTERNAL_URL_RE.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    nodes.push(
      <a
        key={`lnk-${k++}`}
        href={m[1]}
        target="_blank"
        rel="noopener noreferrer"
        className={"ph-msg-text-link" + (mine ? " ph-msg-text-link--mine" : "")}
      >
        {m[1]}
      </a>,
    );
    last = EXTERNAL_URL_RE.lastIndex;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return <>{nodes}</>;
}

export function formatThreadTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MessengerWorkspace({
  activeThreadId: tid,
  onSelectThread,
  variant,
  onNewDmThread,
  showFullPageLink,
  onCloseDockChat,
  dockTab,
}: MessengerWorkspaceProps) {
  const { token, user } = useAuth();
  const { refresh: refreshGlobalThreads } = useThreadNotifications();

  const [threads, setThreads] = useState<ThreadSummaryDto[]>([]);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [compose, setCompose] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [newDmUserId, setNewDmUserId] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newDmErr, setNewDmErr] = useState<string | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const newChatPopRef = useRef<HTMLDivElement>(null);
  const composeBtnRef = useRef<HTMLButtonElement>(null);
  const clientRef = useRef<Client | null>(null);
  const subRef = useRef<StompSubscription | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  );

  const layoutClass = "ph-msg-layout";
  const validTid = Number.isFinite(tid) && tid > 0;

  const loadThreads = useCallback(() => {
    void api<ThreadSummaryDto[]>("/api/chat/threads")
      .then(setThreads)
      .catch((e: unknown) => setListErr(e instanceof Error ? e.message : "Failed to load threads"));
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!token || !Number.isFinite(tid) || tid <= 0) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const page = await api<Page<MessageDto>>(`/api/chat/threads/${tid}/messages?page=0&size=100`);
        const rows = page?.content ?? [];
        if (!cancelled) {
          setMessages([...rows].reverse());
          refreshGlobalThreads();
        }
      } catch {
        if (!cancelled) setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tid, token, refreshGlobalThreads]);

  useEffect(() => {
    if (!token || !Number.isFinite(tid) || tid <= 0) {
      subRef.current?.unsubscribe();
      subRef.current = null;
      clientRef.current?.deactivate();
      clientRef.current = null;
      return;
    }
    const client = createStompClient(
      token,
      (c) => {
        subRef.current?.unsubscribe();
        subRef.current = subscribeThread(c, tid, (raw) => {
          const dto = JSON.parse(raw) as MessageDto;
          setMessages((m) => appendUnique(m, dto));
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

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sorted.length, tid]);

  useEffect(() => {
    if (!newChatOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNewChatOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newChatOpen]);

  useEffect(() => {
    if (!newChatOpen) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (newChatPopRef.current?.contains(t)) return;
      if (composeBtnRef.current?.contains(t)) return;
      setNewChatOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [newChatOpen]);

  async function openNewDm() {
    const id = Number(newDmUserId);
    if (!Number.isFinite(id) || id <= 0) return;
    setNewDmErr(null);
    try {
      const r = await api<{ threadId: number }>(`/api/chat/dm/${id}`, { method: "POST" });
      setNewDmUserId("");
      setNewChatOpen(false);
      loadThreads();
      refreshGlobalThreads();
      const cb = onNewDmThread ?? onSelectThread;
      cb(r.threadId);
    } catch (e: unknown) {
      setNewDmErr(e instanceof Error ? e.message : "Could not open chat");
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setSendErr(null);
    if (!Number.isFinite(tid) || tid <= 0) return;
    const text = compose.trim();
    if (!text && !pendingFile) return;

    const auth = getToken();
    const headers: HeadersInit = {};
    if (auth) headers.Authorization = `Bearer ${auth}`;

    try {
      if (pendingFile) {
        const fd = new FormData();
        if (text) fd.append("body", text);
        fd.append("file", pendingFile);
        const res = await fetch(`/api/chat/threads/${tid}/messages`, { method: "POST", headers, body: fd });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? res.statusText);
        }
        const saved = (await res.json()) as MessageDto;
        setMessages((m) => appendUnique(m, saved));
      } else {
        const saved = await api<MessageDto>(`/api/chat/threads/${tid}/messages`, {
          method: "POST",
          body: JSON.stringify({ body: text }),
        });
        setMessages((m) => appendUnique(m, saved));
      }
      setCompose("");
      setPendingFile(null);
      setPendingPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      loadThreads();
      refreshGlobalThreads();
    } catch (ex: unknown) {
      setSendErr(ex instanceof Error ? ex.message : "Send failed");
    }
  }

  function onPickImage() {
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setPendingFile(null);
      setPendingPreview(null);
      return;
    }
    setPendingFile(f);
    setPendingPreview(URL.createObjectURL(f));
  }

  if (!token || !user) {
    return null;
  }

  const expandMessagesHref = validTid ? `/messages/${tid}` : "/messages";

  const sidebar = (
    <aside className={"ph-msg-sidebar" + (variant === "dock" ? " ph-msg-sidebar--dock-tray" : "")}>
        <div className="ph-msg-sidebar-top-wrap">
          <div className="ph-msg-sidebar-head">
            <div className="ph-msg-sidebar-head-top">
              <h2 className="ph-msg-title" style={{ margin: 0 }}>
                Messaging
              </h2>
              <div className="ph-msg-sidebar-tools">
                {variant === "dock" && showFullPageLink && (
                  <Link to={expandMessagesHref} className="ph-msg-full-link">
                    Expand
                  </Link>
                )}
                <button
                  ref={composeBtnRef}
                  type="button"
                  className="ph-msg-compose-btn"
                  title="New message"
                  aria-expanded={newChatOpen}
                  aria-haspopup="dialog"
                  onClick={() => {
                    setNewDmErr(null);
                    setNewChatOpen((o) => !o);
                  }}
                >
                  <MessageSquarePlus size={22} strokeWidth={2} />
                </button>
              </div>
            </div>
            {variant === "page" ? <p className="ph-msg-sub">All your threads in one place.</p> : null}
          </div>

          {newChatOpen ? (
            <div ref={newChatPopRef} className="ph-msg-new-pop" role="dialog" aria-label="New message">
              <div className="ph-msg-new-pop-head">
                <span className="ph-msg-new-pop-title">New message</span>
                <button type="button" className="ph-msg-new-pop-close" onClick={() => setNewChatOpen(false)} aria-label="Close">
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
              <div className="ph-msg-new-pop-body">
                <label className="ph-label" htmlFor="ph-new-dm-user">
                  To (member ID)
                </label>
                <div className="ph-msg-new-dm-row">
                  <input
                    id="ph-new-dm-user"
                    className="ph-input"
                    type="number"
                    min={1}
                    placeholder="User ID"
                    value={newDmUserId}
                    onChange={(e) => setNewDmUserId(e.target.value)}
                  />
                  <button type="button" className="ph-btn ph-btn-primary" onClick={() => void openNewDm()}>
                    Chat
                  </button>
                </div>
                <p className="ph-msg-hint">Use the ID shown on your Account page.</p>
                {newDmErr ? <p className="ph-msg-err" style={{ margin: "0.5rem 0 0" }}>{newDmErr}</p> : null}
              </div>
            </div>
          ) : null}
        </div>

        {listErr && <p className="ph-msg-err">{listErr}</p>}

        <ul className="ph-msg-thread-list">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={
                  "ph-msg-thread-row" +
                  (t.id === tid ? " ph-msg-thread-row--active" : "") +
                  (variant === "dock" ? " ph-msg-thread-row--dock" : "")
                }
                onClick={() => onSelectThread(t.id)}
              >
                <div className={"ph-msg-avatar" + (t.unread === true ? " ph-msg-avatar--unread" : "")}>
                  {t.otherAvatarUrl ? (
                    <img src={t.otherAvatarUrl} alt="" />
                  ) : (
                    <span>{t.otherDisplayName.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="ph-msg-thread-meta">
                  <div className="ph-msg-thread-top">
                    <strong className="ph-msg-name">
                      {t.otherDisplayName}
                      {t.marketListingId != null ? (
                        <span className="ph-msg-thread-tag" title="About a Paw Market listing">
                          {" "}
                          · Item
                        </span>
                      ) : null}
                    </strong>
                    <span className="ph-msg-time">{formatThreadTime(t.lastMessageAt)}</span>
                  </div>
                  <div className="ph-msg-preview">{t.lastMessagePreview || "No messages yet"}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
  );

  const chatPanel =
    validTid ? (
          <>
            <header className="ph-msg-main-head">
              <div className="ph-msg-main-head-left">
              {(() => {
                const active = threads.find((x) => x.id === tid);
                return active ? (
                  <>
                    <div className="ph-msg-avatar ph-msg-avatar--lg">
                      {active.otherAvatarUrl ? (
                        <img src={active.otherAvatarUrl} alt="" />
                      ) : (
                        <span>{active.otherDisplayName.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="ph-msg-title" style={{ margin: 0 }}>
                        {active.otherDisplayName}
                      </h3>
                      <div className="ph-msg-sub">Thread #{tid}</div>
                    </div>
                  </>
                ) : (
                  <h3 className="ph-msg-title" style={{ margin: 0 }}>
                    Thread #{tid}
                  </h3>
                );
              })()}
              </div>
              {variant === "dock" && onCloseDockChat ? (
                <button
                  type="button"
                  className="ph-msg-dock-chat-close"
                  onClick={onCloseDockChat}
                  aria-label="Close conversation"
                  title="Close"
                >
                  <X size={18} strokeWidth={2.25} />
                </button>
              ) : null}
            </header>

            <div className="ph-msg-scroll">
              {sorted.map((m) => {
                const mine = m.senderId === user.userId;
                const { text: bodyText, listingId: shareListingId } = m.body
                  ? parseListingShareFromMessage(m.body)
                  : { text: "", listingId: null as number | null };
                const copyText = (
                  bodyText.trim() ||
                  m.body?.trim() ||
                  m.attachmentUrl?.trim() ||
                  ""
                ).trim();
                return (
                  <div key={m.id} className={"ph-msg-bubble-wrap" + (mine ? " ph-msg-bubble-wrap--mine" : "")}>
                    <div className={"ph-msg-bubble" + (mine ? " ph-msg-bubble--mine" : "")}>
                      {m.attachmentUrl && (
                        <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="ph-msg-img-link">
                          <img src={m.attachmentUrl} alt="" className="ph-msg-img" />
                        </a>
                      )}
                      {shareListingId != null ? (
                        <ListingShareEmbed listingId={shareListingId} mine={mine} />
                      ) : null}
                      {bodyText ? (
                        <div className="ph-msg-text">
                          <MessageTextWithLinks text={bodyText} mine={mine} />
                        </div>
                      ) : null}
                    </div>
                    <CopyMessageButton text={copyText} variant="messaging" />
                    <div className="ph-msg-ts">{new Date(m.createdAt).toLocaleString()}</div>
                  </div>
                );
              })}
              <div ref={listEndRef} />
            </div>

            <form className="ph-msg-compose" onSubmit={onSend}>
              {pendingPreview && (
                <div className="ph-msg-pending-img">
                  <img src={pendingPreview} alt="" />
                  <span className="ph-msg-pending-img-label">{pendingFile?.name ?? "Image"}</span>
                  <button
                    type="button"
                    className="ph-msg-icon-btn"
                    style={{ marginLeft: "auto" }}
                    title="Remove image"
                    onClick={() => {
                      setPendingFile(null);
                      setPendingPreview(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              {sendErr && <p className="ph-msg-err">{sendErr}</p>}
              <div className="ph-msg-compose-row">
                <input ref={fileRef} type="file" accept="image/*" className="ph-msg-file" onChange={onPickImage} />
                <button
                  type="button"
                  className="ph-msg-icon-btn"
                  onClick={() => fileRef.current?.click()}
                  title="Attach image"
                >
                  <ImagePlus size={18} strokeWidth={1.8} />
                </button>
                <textarea
                  className="ph-msg-input"
                  rows={1}
                  value={compose}
                  onChange={(e) => setCompose(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void onSend(e as unknown as FormEvent); }
                  }}
                  placeholder="Write a message…"
                />
                <button className="ph-msg-send" type="submit" title="Send">
                  <Send size={16} strokeWidth={2} />
                </button>
              </div>
            </form>
          </>
    ) : null;

  if (variant === "dock") {
    return (
      <>
        {validTid ? (
          <div className="ph-msg-dock-float ph-msg-dock-float--chat" role="dialog" aria-modal="false" aria-label="Conversation">
            <section className="ph-msg-main ph-msg-main--dock-chat">{chatPanel}</section>
          </div>
        ) : null}
        <div className="ph-msg-dock-col-list">
          <div className="ph-msg-dock-float ph-msg-dock-float--list" role="dialog" aria-modal="false" aria-label="Messaging contacts">
            {sidebar}
          </div>
          {dockTab}
        </div>
      </>
    );
  }

  return (
    <div className={layoutClass}>
      {sidebar}
      <section className="ph-msg-main">
        {!validTid ? (
          <div className="ph-msg-empty">
            <div className="ph-msg-empty-icon">
              <MessagesSquare size={28} strokeWidth={1.5} />
            </div>
            <h3>Select a conversation</h3>
            <p>Choose a thread on the left, or tap the compose button to start a new chat.</p>
          </div>
        ) : (
          chatPanel
        )}
      </section>
    </div>
  );
}
