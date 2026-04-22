import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft, MessageSquare, Minus, Plus, RefreshCw, Send, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Link } from "react-router-dom";
import { CopyMessageButton } from "../CopyMessageButton";
import { apiUrl, getToken } from "../../api/client";
import "./whisker-chat.css";

/** Multi-session store (localStorage). */
const STORAGE_KEY = "pawhub_pawbot_sessions_v1";
/** Legacy single-thread key — migrated once into STORAGE_KEY. */
const LEGACY_SESSION_KEY = "pawhub_pawbot_chat_v1";

const MAX_MESSAGES_PER_SESSION = 80;
const MAX_SESSIONS = 35;

type Role = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

export type PawBotSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

type PersistedV1 = {
  version: 1;
  activeSessionId: string;
  sessions: PawBotSession[];
};

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return "New chat";
  const t = firstUser.content.trim().replace(/\s+/g, " ");
  return t.length > 48 ? `${t.slice(0, 47)}…` : t;
}

/** Full date + time for list rows and header (locale-aware). */
function formatSessionDateTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfMsg) / (24 * 60 * 60 * 1000));
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (dayDiff === 0) return `Today · ${time}`;
  if (dayDiff === 1) return `Yesterday · ${time}`;
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${time}`;
  }
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${time}`;
}

function sanitizeClientTitle(raw: string): string {
  let t = raw.trim().replace(/\s+/g, " ").replace(/^["'“”]+|["'“”]+$/g, "");
  if (t.length > 72) t = `${t.slice(0, 71)}…`;
  return t;
}

function createSession(): PawBotSession {
  const now = Date.now();
  return {
    id: newId(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function normalizeMessage(m: unknown): ChatMessage | null {
  if (!m || typeof m !== "object") return null;
  const o = m as Record<string, unknown>;
  if (o.role !== "user" && o.role !== "assistant") return null;
  if (typeof o.content !== "string") return null;
  const id = typeof o.id === "string" ? o.id : newId();
  return { id, role: o.role, content: o.content };
}

function normalizeSession(s: unknown): PawBotSession | null {
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const messagesRaw = o.messages;
  if (!Array.isArray(messagesRaw)) return null;
  const messages = messagesRaw.map(normalizeMessage).filter((m): m is ChatMessage => m !== null).slice(-MAX_MESSAGES_PER_SESSION);
  const title = typeof o.title === "string" ? o.title : deriveTitle(messages);
  const createdAt = typeof o.createdAt === "number" ? o.createdAt : Date.now();
  const updatedAt = typeof o.updatedAt === "number" ? o.updatedAt : createdAt;
  return { id: o.id, title, createdAt, updatedAt, messages };
}

function migrateLegacy(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const raw = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { messages?: unknown[] };
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.map(normalizeMessage).filter((m): m is ChatMessage => m !== null).slice(-MAX_MESSAGES_PER_SESSION)
      : [];
    if (messages.length === 0) return;
    const session = createSession();
    session.messages = messages;
    session.title = deriveTitle(messages);
    session.updatedAt = Date.now();
    const payload: PersistedV1 = { version: 1, activeSessionId: session.id, sessions: [session] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function loadPersisted(): { sessions: PawBotSession[]; activeSessionId: string } {
  migrateLegacy();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as PersistedV1;
      if (p?.version === 1 && Array.isArray(p.sessions)) {
        const sessions = p.sessions.map(normalizeSession).filter((s): s is PawBotSession => s !== null);
        let activeSessionId = typeof p.activeSessionId === "string" ? p.activeSessionId : "";
        if (!sessions.some((s) => s.id === activeSessionId) && sessions.length > 0) {
          activeSessionId = sessions[0].id;
        }
        if (sessions.length === 0) {
          const s = createSession();
          return { sessions: [s], activeSessionId: s.id };
        }
        return { sessions, activeSessionId: activeSessionId || sessions[0].id };
      }
    }
  } catch {
    /* ignore */
  }
  const s = createSession();
  return { sessions: [s], activeSessionId: s.id };
}

function savePersisted(activeSessionId: string, sessions: PawBotSession[]) {
  try {
    const trimmed = sessions
      .map((s) => ({
        ...s,
        messages: s.messages.slice(-MAX_MESSAGES_PER_SESSION),
      }))
      .slice(0, MAX_SESSIONS);
    const payload: PersistedV1 = { version: 1, activeSessionId, sessions: trimmed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

function truncateStatus(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

const STARTERS = [
  { label: "New kitten tips", prompt: "What are your top tips for a new kitten at home?" },
  { label: "Litter box issues", prompt: "My cat stopped using the litter box — what should I check first?" },
  { label: "Explain PawHub features", prompt: "Briefly explain PawHub: Learn hub, community, market, and adoption — where do I go for each?" },
];

function PawBotCatIcon() {
  return (
    <svg className="whisker-cat-face" viewBox="0 0 48 48" aria-hidden>
      <path
        className="whisker-cat-ear"
        d="M10 18 L6 6 L16 14 Z M38 18 L42 6 L32 14 Z"
      />
      <ellipse className="whisker-cat-face-shape" cx="24" cy="26" rx="18" ry="16" />
      <ellipse className="whisker-eye" cx="17" cy="24" rx="2.2" ry="3" />
      <ellipse className="whisker-eye whisker-eye--wink" cx="31" cy="24" rx="2.2" ry="3" />
      <path className="whisker-nose" d="M24 28 l-2 3 h4 z" />
      <path className="whisker-smile" d="M18 34 q6 4 12 0" />
    </svg>
  );
}

export function ChatWidget() {
  const initial = useMemo(() => loadPersisted(), []);
  const [sessions, setSessions] = useState<PawBotSession[]>(initial.sessions);
  const [activeSessionId, setActiveSessionId] = useState(initial.activeSessionId);
  const [panelMode, setPanelMode] = useState<"chat" | "history">("chat");

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = getToken();
  const panelVisible = open && !minimized;
  const [aiHealthPhase, setAiHealthPhase] = useState<"idle" | "loading" | "ok" | "error">("loading");
  const [aiHealthDetail, setAiHealthDetail] = useState("");
  const lastAiFetchRef = useRef(0);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId),
    [sessions, activeSessionId],
  );
  const messages = activeSession?.messages ?? [];
  const currentTitle = activeSession?.title ?? "New chat";
  const sessionActivityLabel = activeSession ? formatSessionDateTime(activeSession.updatedAt) : "";

  const requestAiTitle = useCallback(async (sessionId: string, msgs: ChatMessage[]) => {
    const t = getToken();
    if (!t) return;
    const trimmed = msgs
      .filter((m) => (m.role === "user" && m.content.trim()) || (m.role === "assistant" && m.content.trim()))
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.content.length > 6000 ? `${m.content.slice(0, 6000)}` : m.content,
      }));
    if (trimmed.length === 0) return;
    try {
      const res = await fetch(apiUrl("/api/chat/title"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ messages: trimmed }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { title?: string | null };
      const raw = typeof data.title === "string" ? data.title : "";
      const title = sanitizeClientTitle(raw);
      if (!title) return;
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title } : s)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    savePersisted(activeSessionId, sessions);
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (!sessions.some((s) => s.id === activeSessionId)) {
      const fallback = sessions[0];
      if (fallback) setActiveSessionId(fallback.id);
      else {
        const fresh = createSession();
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
      }
    }
  }, [sessions, activeSessionId]);

  const startNewChatFix = useCallback(() => {
    if (loading) return;
    setSessions((prev) => {
      const cur = prev.find((s) => s.id === activeSessionId);
      if (cur && cur.messages.length === 0) return prev;
      const fresh = createSession();
      setActiveSessionId(fresh.id);
      return [fresh, ...prev].slice(0, MAX_SESSIONS);
    });
    setPanelMode("chat");
    setError(null);
  }, [loading, activeSessionId]);

  const openHistory = useCallback(() => {
    if (loading) return;
    setPanelMode("history");
  }, [loading]);

  const selectSession = useCallback(
    (id: string) => {
      if (loading) return;
      setActiveSessionId(id);
      setPanelMode("chat");
      setError(null);
    },
    [loading],
  );

  const removeSession = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (loading) return;
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (next.length === 0) {
          const fresh = createSession();
          setActiveSessionId(fresh.id);
          return [fresh];
        }
        if (id === activeSessionId) {
          setActiveSessionId(next[0].id);
        }
        return next;
      });
    },
    [loading, activeSessionId],
  );

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  const fetchAiHealth = useCallback(
    async (force: boolean) => {
      const t = getToken();
      if (!t) return;
      const now = Date.now();
      if (!force && now - lastAiFetchRef.current < 4500) return;
      lastAiFetchRef.current = Date.now();
      setAiHealthPhase("loading");
      try {
        const res = await fetch(apiUrl("/api/chat/status"), {
          headers: { Authorization: `Bearer ${t}` },
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        const msg = typeof data.message === "string" ? data.message : "";
        if (data.ok === true) {
          setAiHealthPhase("ok");
          setAiHealthDetail(msg || "Connected.");
        } else {
          setAiHealthPhase("error");
          setAiHealthDetail(
            msg || "PawBot is not available. Check PAWHUB_GEMINI_API_KEY and pawhub.gemini.whisker-model on the server.",
          );
        }
      } catch {
        setAiHealthPhase("error");
        setAiHealthDetail("Could not reach the server to verify PawBot.");
      }
    },
    [],
  );

  useEffect(() => {
    if (!token) return;
    void fetchAiHealth(false);
  }, [token, fetchAiHealth]);

  useEffect(() => {
    if (!token || !panelVisible) return;
    void fetchAiHealth(true);
  }, [token, panelVisible, fetchAiHealth]);

  const aiReady = aiHealthPhase === "ok";

  useEffect(() => {
    if (open && !minimized && panelMode === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized, loading, panelMode]);

  const showStarters = messages.length === 0 && panelMode === "chat";

  const sendPayload = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || !token || !aiReady) return;

      setError(null);
      const userMsg: ChatMessage = { id: newId(), role: "user", content: trimmed };
      const assistantId = newId();

      const sessionIdForSend = activeSessionId;
      const historyForApi = [...messages, userMsg];
      /** Only ask Gemini for a title on the first assistant reply; later turns keep the existing title. */
      const shouldGenerateAiTitle = !messages.some((m) => m.role === "assistant" && m.content.trim());

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionIdForSend) return s;
          const nextMsgs = [...historyForApi, { id: assistantId, role: "assistant" as const, content: "" }];
          return {
            ...s,
            messages: nextMsgs,
            updatedAt: Date.now(),
            title: deriveTitle(nextMsgs),
          };
        }),
      );
      setInput("");
      setLoading(true);

      try {
        const res = await fetch(apiUrl("/api/chat/stream"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: historyForApi.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok) {
          let msg = res.statusText;
          try {
            const j = await res.json();
            if (j.error) msg = j.error;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let assistantBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            let j: { c?: string; error?: string; done?: boolean };
            try {
              j = JSON.parse(trimmedLine) as { c?: string; error?: string; done?: boolean };
            } catch {
              continue;
            }
            if (j.error) {
              setError(j.error);
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === sessionIdForSend ? { ...s, messages: s.messages.filter((m) => m.id !== assistantId) } : s,
                ),
              );
              setLoading(false);
              return;
            }
            if (typeof j.c === "string" && j.c.length > 0) {
              assistantBuffer += j.c;
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== sessionIdForSend) return s;
                  return {
                    ...s,
                    messages: s.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + j.c } : m)),
                    updatedAt: Date.now(),
                    title: deriveTitle(
                      s.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + j.c } : m)),
                    ),
                  };
                }),
              );
            }
            if (j.done) {
              setLoading(false);
              if (assistantBuffer.trim() && shouldGenerateAiTitle) {
                void requestAiTitle(sessionIdForSend, [
                  ...historyForApi,
                  { id: assistantId, role: "assistant", content: assistantBuffer },
                ]);
              }
              return;
            }
          }
        }

        if (buffer.trim()) {
          try {
            const j = JSON.parse(buffer.trim()) as { c?: string; error?: string; done?: boolean };
            if (j.error) setError(j.error);
            if (typeof j.c === "string" && j.c) {
              assistantBuffer += j.c;
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== sessionIdForSend) return s;
                  const next = s.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + j.c } : m));
                  return { ...s, messages: next, updatedAt: Date.now(), title: deriveTitle(next) };
                }),
              );
            }
          } catch {
            /* ignore trailing garbage */
          }
        }

        if (assistantBuffer.trim() && shouldGenerateAiTitle) {
          void requestAiTitle(sessionIdForSend, [
            ...historyForApi,
            { id: assistantId, role: "assistant", content: assistantBuffer },
          ]);
        }

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionIdForSend) return s;
            const last = s.messages.find((m) => m.id === assistantId);
            if (last && last.content === "") {
              return { ...s, messages: s.messages.filter((m) => m.id !== assistantId) };
            }
            return s;
          }),
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        setError(msg);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionIdForSend ? { ...s, messages: s.messages.filter((m) => m.id !== assistantId) } : s,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [aiReady, loading, messages, token, activeSessionId, requestAiTitle],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPayload(input);
  };

  const markdownComponents = useMemo(
    () => ({
      a: ({ href, children, ...rest }: { href?: string; children?: React.ReactNode }) => {
        if (href?.startsWith("/")) {
          return (
            <Link to={href} {...rest}>
              {children}
            </Link>
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
            {children}
          </a>
        );
      },
    }),
    [],
  );

  if (!token) {
    return null;
  }

  return (
    <div
      className="whisker-root"
      style={{
        position: "fixed",
        zIndex: 10050,
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 12,
        pointerEvents: "none",
      }}
    >
      <AnimatePresence>
        {panelVisible ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            style={{ pointerEvents: "auto", originX: 1, originY: 1 }}
          >
            <div className="whisker-panel">
              <header className="whisker-header">
                <div className="whisker-header-text">
                  <h2 className="whisker-title">{panelMode === "history" ? "Chat history" : "PawBot"}</h2>
                  {panelMode === "chat" ? (
                    <div className="whisker-session-heading">
                      <p className="whisker-session-line" title={currentTitle}>
                        {currentTitle}
                      </p>
                      <p className="whisker-session-date" title={sessionActivityLabel}>
                        {sessionActivityLabel}
                      </p>
                    </div>
                  ) : null}
                  {panelMode === "chat" ? (
                    <p className="whisker-sub" title={aiHealthDetail || undefined}>
                      <span
                        className={`whisker-dot ${
                          aiHealthPhase === "loading"
                            ? "whisker-dot--loading"
                            : aiHealthPhase === "error"
                              ? "whisker-dot--offline"
                              : ""
                        }`}
                        aria-hidden
                      />
                      <span className="whisker-sub-text">
                        {aiHealthPhase === "loading"
                          ? "Checking PawBot…"
                          : aiHealthPhase === "ok"
                            ? "PawHub assistant · Online"
                            : truncateStatus(aiHealthDetail, 96)}
                      </span>
                    </p>
                  ) : (
                    <p className="whisker-sub whisker-sub--muted">
                      <span className="whisker-sub-text">Previous conversations on this device</span>
                    </p>
                  )}
                </div>
                <div className="whisker-header-actions">
                  {panelMode === "chat" ? (
                    <>
                      <button
                        type="button"
                        className="whisker-icon-btn"
                        aria-label="Chat history"
                        title="Previous chats"
                        disabled={loading}
                        onClick={() => openHistory()}
                      >
                        <MessageSquare size={18} strokeWidth={2.25} />
                      </button>
                      <button
                        type="button"
                        className="whisker-icon-btn"
                        aria-label="New chat"
                        title="New chat"
                        disabled={loading}
                        onClick={() => startNewChatFix()}
                      >
                        <Plus size={18} strokeWidth={2.25} />
                      </button>
                      <button
                        type="button"
                        className="whisker-icon-btn"
                        aria-label="Recheck PawBot connection"
                        title="Recheck connection"
                        disabled={aiHealthPhase === "loading"}
                        onClick={() => void fetchAiHealth(true)}
                      >
                        <RefreshCw size={18} strokeWidth={2.25} className={aiHealthPhase === "loading" ? "whisker-spin" : undefined} />
                      </button>
                      <button
                        type="button"
                        className="whisker-icon-btn"
                        aria-label="Minimize chat"
                        title="Minimize"
                        onClick={() => {
                          setMinimized(true);
                        }}
                      >
                        <Minus size={18} strokeWidth={2.25} />
                      </button>
                      <button
                        type="button"
                        className="whisker-icon-btn"
                        aria-label="Close chat"
                        title="Close"
                        onClick={() => {
                          setOpen(false);
                          setMinimized(false);
                          setPanelMode("chat");
                        }}
                      >
                        <X size={18} strokeWidth={2.25} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="whisker-icon-btn"
                        aria-label="Back to chat"
                        title="Back"
                        onClick={() => setPanelMode("chat")}
                      >
                        <ChevronLeft size={18} strokeWidth={2.25} />
                      </button>
                      <button
                        type="button"
                        className="whisker-icon-btn"
                        aria-label="Close chat"
                        title="Close"
                        onClick={() => {
                          setOpen(false);
                          setMinimized(false);
                          setPanelMode("chat");
                        }}
                      >
                        <X size={18} strokeWidth={2.25} />
                      </button>
                    </>
                  )}
                </div>
              </header>

              {panelMode === "history" ? (
                <div className="whisker-history">
                  <ul className="whisker-history-list" role="list">
                    {sortedSessions.map((s) => (
                      <li key={s.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          className={`whisker-history-row ${s.id === activeSessionId ? "whisker-history-row--active" : ""}`}
                          onClick={() => selectSession(s.id)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              selectSession(s.id);
                            }
                          }}
                        >
                          <div className="whisker-history-row-main">
                            <span className="whisker-history-row-title">{s.title}</span>
                            <span className="whisker-history-row-date">{formatSessionDateTime(s.updatedAt)}</span>
                          </div>
                          <button
                            type="button"
                            className="whisker-history-delete"
                            aria-label={`Delete chat “${s.title}”`}
                            onClick={(e) => removeSession(s.id, e)}
                          >
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="whisker-history-footer">
                    <button type="button" className="whisker-pill whisker-pill--block" onClick={() => startNewChatFix()}>
                      <Plus size={16} strokeWidth={2.25} /> Start new chat
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {showStarters ? (
                    <div className="whisker-starters">
                      {STARTERS.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          className="whisker-pill"
                          disabled={loading || !aiReady}
                          onClick={() => void sendPayload(s.prompt)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {aiHealthPhase === "error" ? (
                    <div className="whisker-offline-banner" role="status">
                      <p className="whisker-offline-banner__text">{aiHealthDetail}</p>
                      <button type="button" className="whisker-pill whisker-pill--compact" onClick={() => void fetchAiHealth(true)}>
                        Retry connection
                      </button>
                    </div>
                  ) : null}

                  {error ? <div className="whisker-err">{error}</div> : null}

                  <div className="whisker-body">
                    {messages.map((m, i) => (
                      <motion.div
                        key={m.id}
                        className={`whisker-msg-stack whisker-msg-stack--${m.role === "user" ? "user" : "bot"}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.35), type: "spring", stiffness: 380, damping: 28 }}
                      >
                        <div className={`whisker-msg whisker-msg--${m.role === "user" ? "user" : "bot"}`}>
                          {m.role === "user" ? (
                            m.content
                          ) : (
                            <div className="whisker-md">
                              {m.content ? (
                                <Markdown components={markdownComponents}>{m.content}</Markdown>
                              ) : loading ? (
                                <span style={{ color: "var(--whisker-muted)", fontStyle: "italic" }}>Thinking…</span>
                              ) : null}
                            </div>
                          )}
                        </div>
                        {m.content.trim() ? (
                          <CopyMessageButton
                            text={m.content}
                            variant={m.role === "user" ? "whisker-user" : "whisker-bot"}
                          />
                        ) : null}
                      </motion.div>
                    ))}
                    <div ref={bottomRef} />
                  </div>

                  <footer className="whisker-footer">
                    <form onSubmit={onSubmit} className="whisker-input-row">
                      <textarea
                        className="whisker-input"
                        rows={1}
                        placeholder="Ask about cats or PawHub…"
                        value={input}
                        disabled={loading || !aiReady}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void sendPayload(input);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        className="whisker-send"
                        disabled={loading || !input.trim() || !aiReady}
                        aria-label={loading ? "Sending" : "Send"}
                      >
                        {loading ? <span className="whisker-spinner" /> : <Send size={20} strokeWidth={2.25} />}
                      </button>
                    </form>
                  </footer>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open && minimized ? (
          <motion.button
            key="peek"
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="whisker-pill"
            style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => setMinimized(false)}
          >
            <ChevronDown size={16} />
            PawBot
          </motion.button>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        className={`whisker-fab${aiHealthPhase === "error" ? " whisker-fab--offline" : ""}`}
        aria-label={open ? "PawBot chat" : "Open PawBot chat"}
        title={
          aiHealthPhase === "ok"
            ? "PawBot — online"
            : aiHealthPhase === "error"
              ? `PawBot — offline: ${aiHealthDetail}`
              : "PawBot — checking connection…"
        }
        onClick={() => {
          if (open && minimized) {
            setMinimized(false);
            return;
          }
          setOpen((o) => !o);
          if (!open) setMinimized(false);
        }}
        animate={
          open && !minimized
            ? { scale: [1, 1.04, 1] }
            : { scale: [1, 1.06, 1] }
        }
        transition={
          open && !minimized
            ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ pointerEvents: "auto" }}
      >
        <PawBotCatIcon />
      </motion.button>
    </div>
  );
}
