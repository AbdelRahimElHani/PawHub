import { Camera, ImagePlus, MessagesSquare, MessageSquarePlus, Send, X } from "lucide-react";
import { CopyMessageButton } from "../components/CopyMessageButton";
import { type ReactNode, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, apiUrl, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useThreadNotifications } from "../notifications/ThreadNotificationContext";
import { useChatStomp } from "../chat/ChatStompContext";
import type { MessageDto, PawMarketOrderThreadDto, ThreadSummaryDto } from "../types";
import { AdoptionListingShareEmbed } from "./AdoptionListingShareEmbed";
import { ListingShareEmbed } from "./ListingShareEmbed";
import { parseMessageEmbeds } from "./listingShareMessage";
import { PeerTypingIndicator } from "./PeerTypingIndicator";
import { useMediaLightbox } from "../components/media/MediaLightboxContext";
import { inferMediaLightboxKind, isPreviewableMediaUrl } from "../components/media/inferMediaKind";

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

/** Match server preview line for thread list (see ChatService#previewLine). */
function previewFromMessage(m: MessageDto): string {
  const hasImg = m.attachmentUrl != null && m.attachmentUrl !== "";
  const b = m.body?.trim() ?? "";
  if (hasImg && !b) {
    return "[Photo]";
  }
  if (hasImg && b) {
    return b.length > 60 ? b.substring(0, 57) + "…" : b;
  }
  if (!b) {
    return "";
  }
  return b.length > 80 ? b.substring(0, 77) + "…" : b;
}

/** Linkify non-listing https URLs in message text (listing URLs are stripped and shown as embed cards). */
const EXTERNAL_URL_RE = /(https?:\/\/[^\s]+)/g;

function MessageTextWithLinks({ text, mine }: { text: string; mine: boolean }) {
  const { openMedia } = useMediaLightbox();
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
    const href = m[1];
    if (isPreviewableMediaUrl(href)) {
      nodes.push(
        <button
          key={`lnk-${k++}`}
          type="button"
          className={"ph-msg-text-link-btn" + (mine ? " ph-msg-text-link-btn--mine" : "")}
          onClick={() => openMedia(href)}
        >
          {href}
        </button>,
      );
    } else {
      nodes.push(
        <a
          key={`lnk-${k++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={"ph-msg-text-link" + (mine ? " ph-msg-text-link--mine" : "")}
        >
          {href}
        </a>,
      );
    }
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
  onNewDmThread: _onNewDmThread,
  showFullPageLink,
  onCloseDockChat,
  dockTab,
}: MessengerWorkspaceProps) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh: refreshGlobalThreads } = useThreadNotifications();
  const { setActiveThread, sendTyping, registerInbox } = useChatStomp();
  const { openMedia } = useMediaLightbox();

  const [threads, setThreads] = useState<ThreadSummaryDto[]>([]);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [compose, setCompose] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const liveCameraVideoRef = useRef<HTMLVideoElement>(null);
  const liveCameraStreamRef = useRef<MediaStream | null>(null);
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [liveCameraBusy, setLiveCameraBusy] = useState(false);
  const newChatPopRef = useRef<HTMLDivElement>(null);
  const composeBtnRef = useRef<HTMLButtonElement>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const tidRef = useRef(tid);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [peerTyping, setPeerTyping] = useState<string | null>(null);

  const [pawMarketCtx, setPawMarketCtx] = useState<PawMarketOrderThreadDto | null>(null);
  const [pawMarketErr, setPawMarketErr] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [adoptOutcomeBusy, setAdoptOutcomeBusy] = useState(false);
  const [qtyDraft, setQtyDraft] = useState("");

  const sorted = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  );

  const layoutClass = "ph-msg-layout";
  const validTid = Number.isFinite(tid) && tid > 0;

  const activeThread = useMemo(
    () => (validTid ? threads.find((x) => x.id === tid) : undefined),
    [threads, tid, validTid],
  );
  const dmLocked = Boolean(activeThread?.directMessagingLocked);
  const showIncomingRequest =
    activeThread?.type === "DIRECT" && activeThread?.messageRequestIncoming === true;
  const showOutgoingPending =
    activeThread?.type === "DIRECT" && activeThread?.messageRequestOutgoing === true;
  const showDeclined =
    activeThread?.type === "DIRECT" && activeThread?.messageRequestDeclined === true;
  /** e.g. recipient after declining, or either side when declined until friends — server sets locked without the other flags. */
  const showConversationPaused =
    dmLocked && !showIncomingRequest && !showOutgoingPending && !showDeclined;

  const isAdoptionThread = activeThread?.type === "ADOPTION";
  const adoptOutcome = (activeThread?.adoptionInquiryOutcome ?? "PENDING") as
    | "PENDING"
    | "CONFIRMED"
    | "DECLINED";
  const adoptListStatus = (activeThread?.adoptionListingStatus ?? "ACTIVE") as
    | "ACTIVE"
    | "SOLD"
    | "ARCHIVED"
    | string;
  const adoptImShelter = activeThread?.adoptionImShelter === true;

  const loadThreads = useCallback(() => {
    void api<ThreadSummaryDto[]>("/api/chat/threads")
      .then(setThreads)
      .catch((e: unknown) => setListErr(e instanceof Error ? e.message : "Failed to load conversations"));
  }, []);

  const runAdoptShelterOutcome = useCallback(
    async (decision: "CONFIRM" | "DECLINE") => {
      if (!validTid || adoptOutcomeBusy) return;
      setAdoptOutcomeBusy(true);
      setSendErr(null);
      try {
        await api("/api/adopt/inquiries/threads/" + String(tid) + "/shelter-outcome", {
          method: "POST",
          body: JSON.stringify({ decision }),
        });
        loadThreads();
        const page = await api<Page<MessageDto>>(`/api/chat/threads/${tid}/messages?page=0&size=100`);
        const rows = page?.content ?? [];
        setMessages([...rows].reverse());
        void refreshGlobalThreads();
      } catch (e: unknown) {
        setSendErr(e instanceof Error ? e.message : "Could not update adoption status");
      } finally {
        setAdoptOutcomeBusy(false);
      }
    },
    [validTid, adoptOutcomeBusy, tid, loadThreads, refreshGlobalThreads],
  );

  const loadPawMarketCtx = useCallback(async () => {
    if (!token || !validTid || !activeThread || activeThread.type !== "LISTING") {
      setPawMarketCtx(null);
      setPawMarketErr(null);
      return;
    }
    try {
      setPawMarketErr(null);
      const d = await api<PawMarketOrderThreadDto>(`/api/paw/orders/thread/${tid}`);
      setPawMarketCtx(d);
      setQtyDraft(d.quantity > 0 ? String(d.quantity) : "");
    } catch (e: unknown) {
      setPawMarketCtx(null);
      setPawMarketErr(e instanceof Error ? e.message : "Could not load order status");
    }
  }, [token, validTid, tid, activeThread?.type, activeThread?.id]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    void loadPawMarketCtx();
  }, [loadPawMarketCtx]);

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
    tidRef.current = tid;
  }, [tid]);

  useEffect(() => {
    if (!validTid) return;
    const params = new URLSearchParams(location.search);
    if (params.get("compose") !== "more-details") return;
    const preset = "Hi — can I know more details about this listing before I place an order?";
    setCompose((prev) => (prev.trim() ? prev : preset));
    params.delete("compose");
    const q = params.toString();
    navigate({ pathname: location.pathname, search: q ? `?${q}` : "" }, { replace: true });
  }, [validTid, tid, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!token) return;
    return registerInbox((p) => {
      const pid = Number(p.threadId);
      const openTid = Number(tidRef.current);
      const isOpenForThis = Number.isFinite(openTid) && openTid > 0 && pid === openTid;
      if (isOpenForThis) {
        setMessages((m) => appendUnique(m, p.message));
      }
      setThreads((rows) => {
        const i = rows.findIndex((r) => r.id === pid);
        if (i < 0) {
          return rows;
        }
        const nextRow: ThreadSummaryDto = {
          ...rows[i],
          lastMessagePreview: previewFromMessage(p.message),
          lastMessageAt: p.message.createdAt,
        };
        const rest = rows.filter((_, j) => j !== i);
        return [nextRow, ...rest].sort((a, b) => {
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tb - ta;
        });
      });
      void loadThreads();
    });
  }, [token, registerInbox, loadThreads]);

  useEffect(() => {
    if (!token || !user || !Number.isFinite(tid) || tid <= 0) {
      setActiveThread(null, null);
      setPeerTyping(null);
      if (peerClearRef.current) {
        clearTimeout(peerClearRef.current);
        peerClearRef.current = null;
      }
      return;
    }
    const myId = user.userId;
    setActiveThread(tid, {
      onMessage: (raw) => {
        try {
          const dto = JSON.parse(raw) as MessageDto;
          setMessages((m) => appendUnique(m, dto));
        } catch {
          /* ignore malformed STOMP body */
        }
      },
      onTyping: (raw) => {
        let t: { userId: number; displayName: string; typing: boolean };
        try {
          t = JSON.parse(raw);
        } catch {
          return;
        }
        if (t.userId === myId) return;
        if (t.typing) {
          setPeerTyping(t.displayName || "Someone");
          if (peerClearRef.current) clearTimeout(peerClearRef.current);
          peerClearRef.current = setTimeout(() => setPeerTyping(null), 4000);
        } else {
          setPeerTyping(null);
        }
      },
    });
    return () => {
      setActiveThread(null, null);
    };
  }, [tid, token, user?.userId, setActiveThread]);

  useEffect(() => {
    return () => {
      if (validTid && Number.isFinite(tid) && tid > 0) {
        sendTyping(tid, false);
      }
      if (typingIdleRef.current) {
        clearTimeout(typingIdleRef.current);
        typingIdleRef.current = null;
      }
    };
  }, [tid, validTid, sendTyping]);

  const scheduleComposerTyping = useCallback(
    (textLen: number) => {
      if (!validTid) return;
      if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
      if (textLen > 0) {
        sendTyping(tid, true);
        typingIdleRef.current = setTimeout(() => {
          sendTyping(tid, false);
          typingIdleRef.current = null;
        }, 2800);
      } else {
        sendTyping(tid, false);
      }
    },
    [validTid, tid, sendTyping],
  );

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sorted.length, tid, peerTyping]);

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

  const stopLiveCamera = useCallback(() => {
    liveCameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    liveCameraStreamRef.current = null;
    const v = liveCameraVideoRef.current;
    if (v) v.srcObject = null;
  }, []);

  useEffect(() => {
    if (!liveCameraOpen) return;
    const v = liveCameraVideoRef.current;
    const s = liveCameraStreamRef.current;
    if (!v || !s) return;
    v.srcObject = s;
    void v.play().catch(() => {});
    return () => {
      stopLiveCamera();
    };
  }, [liveCameraOpen, stopLiveCamera]);

  useEffect(() => {
    if (!liveCameraOpen) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        setLiveCameraOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [liveCameraOpen]);

  const openLiveCamera = useCallback(async () => {
    if (dmLocked) return;
    setSendErr(null);
    stopLiveCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraRef.current?.click();
      return;
    }
    setLiveCameraBusy(true);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      liveCameraStreamRef.current = stream;
      setLiveCameraOpen(true);
    } catch (e) {
      setSendErr(e instanceof Error ? e.message : "Could not access camera.");
      cameraRef.current?.click();
    } finally {
      setLiveCameraBusy(false);
    }
  }, [dmLocked, stopLiveCamera]);

  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, [stopLiveCamera]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setSendErr(null);
    if (dmLocked) {
      setSendErr("This chat isn't open for sending yet.");
      return;
    }
    if (!Number.isFinite(tid) || tid <= 0) return;
    const text = compose.trim();
    if (!text && !pendingFile) return;
    if (typingIdleRef.current) {
      clearTimeout(typingIdleRef.current);
      typingIdleRef.current = null;
    }
    sendTyping(tid, false);

    const auth = getToken();
    const headers: HeadersInit = {};
    if (auth) headers.Authorization = `Bearer ${auth}`;

    try {
      if (pendingFile) {
        const fd = new FormData();
        if (text) fd.append("body", text);
        fd.append("file", pendingFile);
        const res = await fetch(apiUrl(`/api/chat/threads/${tid}/messages`), { method: "POST", headers, body: fd });
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
      if (cameraRef.current) cameraRef.current.value = "";
      loadThreads();
      refreshGlobalThreads();
    } catch (ex: unknown) {
      setSendErr(ex instanceof Error ? ex.message : "Send failed");
    }
  }

  async function acceptMessageRequest() {
    if (!validTid) return;
    setSendErr(null);
    try {
      await api(`/api/chat/threads/${tid}/message-request/accept`, { method: "POST" });
      await loadThreads();
    } catch (ex: unknown) {
      setSendErr(ex instanceof Error ? ex.message : "Could not accept.");
    }
  }

  async function declineMessageRequest() {
    if (!validTid) return;
    setSendErr(null);
    try {
      await api(`/api/chat/threads/${tid}/message-request/decline`, { method: "POST" });
      await loadThreads();
    } catch (ex: unknown) {
      setSendErr(ex instanceof Error ? ex.message : "Could not decline.");
    }
  }

  async function pawMarketConfirm() {
    if (!pawMarketCtx?.orderId) return;
    setPawMarketErr(null);
    try {
      const d = await api<PawMarketOrderThreadDto>(`/api/paw/orders/${pawMarketCtx.orderId}/confirm`, {
        method: "POST",
      });
      setPawMarketCtx(d);
      await loadThreads();
    } catch (ex: unknown) {
      setPawMarketErr(ex instanceof Error ? ex.message : "Could not confirm.");
    }
  }

  async function pawMarketDecline() {
    if (!pawMarketCtx?.orderId) return;
    setPawMarketErr(null);
    try {
      await api(`/api/paw/orders/${pawMarketCtx.orderId}/decline`, { method: "POST" });
      await loadPawMarketCtx();
      await loadThreads();
    } catch (ex: unknown) {
      setPawMarketErr(ex instanceof Error ? ex.message : "Could not decline.");
    }
  }

  async function pawMarketSaveQuantity() {
    if (!pawMarketCtx?.orderId) return;
    const n = Number(qtyDraft);
    if (!Number.isFinite(n) || n < 1) {
      setPawMarketErr("Enter a valid quantity.");
      return;
    }
    setPawMarketErr(null);
    try {
      const d = await api<PawMarketOrderThreadDto>(`/api/paw/orders/${pawMarketCtx.orderId}/quantity`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: Math.floor(n) }),
      });
      setPawMarketCtx(d);
      setQtyDraft(String(d.quantity));
      await loadThreads();
    } catch (ex: unknown) {
      setPawMarketErr(ex instanceof Error ? ex.message : "Could not update quantity.");
    }
  }

  async function pawMarketSubmitReview() {
    if (!pawMarketCtx?.orderId || !activeThread) return;
    setPawMarketErr(null);
    setReviewBusy(true);
    try {
      await api("/api/paw/reviews", {
        method: "POST",
        body: JSON.stringify({
          orderId: pawMarketCtx.orderId,
          targetUserId: activeThread.otherUserId,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });
      setReviewComment("");
      await loadPawMarketCtx();
      await loadThreads();
    } catch (ex: unknown) {
      setPawMarketErr(ex instanceof Error ? ex.message : "Could not submit review.");
    } finally {
      setReviewBusy(false);
    }
  }

  function applyPickedImageFile(f: File | undefined) {
    if (dmLocked) {
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
      return;
    }
    if (!f) {
      setPendingFile(null);
      setPendingPreview(null);
      return;
    }
    setPendingFile(f);
    setPendingPreview(URL.createObjectURL(f));
  }

  function onPickImageFromGallery() {
    const f = fileRef.current?.files?.[0];
    applyPickedImageFile(f);
  }

  function onPickImageFromCamera() {
    const f = cameraRef.current?.files?.[0];
    applyPickedImageFile(f);
  }

  function captureLivePhoto() {
    const v = liveCameraVideoRef.current;
    if (!v || v.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        applyPickedImageFile(file);
        setLiveCameraOpen(false);
      },
      "image/jpeg",
      0.92,
    );
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
                  title="Start a conversation from People"
                  aria-expanded={newChatOpen}
                  aria-haspopup="dialog"
                  onClick={() => setNewChatOpen((o) => !o)}
                >
                  <MessageSquarePlus size={22} strokeWidth={2} />
                </button>
              </div>
            </div>
            {variant === "page" ? <p className="ph-msg-sub">Your conversations in one place.</p> : null}
          </div>

          {newChatOpen ? (
            <div ref={newChatPopRef} className="ph-msg-new-pop" role="dialog" aria-label="Start a conversation">
              <div className="ph-msg-new-pop-head">
                <span className="ph-msg-new-pop-title">New conversation</span>
                <button type="button" className="ph-msg-new-pop-close" onClick={() => setNewChatOpen(false)} aria-label="Close">
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
              <div className="ph-msg-new-pop-body">
                <p className="ph-msg-hint" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
                  Go to <strong>People</strong> to message someone you&apos;re connected with (Friends), or meet people in{" "}
                  <strong>Discover</strong> first.
                </p>
                <Link
                  to="/people"
                  className="ph-btn ph-btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setNewChatOpen(false)}
                >
                  Open People
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        {listErr && <p className="ph-msg-err">{listErr}</p>}

        <ul className="ph-msg-thread-list">
          {threads.map((t) => (
            <li key={t.id} className="ph-msg-thread-li">
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
                      {t.type === "ADOPTION" || t.adoptionListingId != null ? (
                        <span className="ph-msg-thread-tag" title="About a Paw Adopt listing">
                          {" "}
                          · Paw Adopt
                        </span>
                      ) : null}
                      {t.marketListingId != null && t.type !== "ADOPTION" && t.adoptionListingId == null ? (
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
              <button
                type="button"
                className="ph-msg-thread-profile-btn"
                title="View profile"
                onClick={() => navigate(`/users/${t.otherUserId}`)}
              >
                Profile
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
              {activeThread ? (
                  <>
                    <div className="ph-msg-avatar ph-msg-avatar--lg">
                      {activeThread.otherAvatarUrl ? (
                        <img src={activeThread.otherAvatarUrl} alt="" />
                      ) : (
                        <span>{activeThread.otherDisplayName.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="ph-msg-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        {activeThread.otherDisplayName}
                        <button
                          type="button"
                          className="ph-btn ph-btn-ghost"
                          style={{ fontSize: "0.78rem", padding: "0.15rem 0.5rem" }}
                          onClick={() => navigate(`/users/${activeThread.otherUserId}`)}
                        >
                          View profile
                        </button>
                      </h3>
                      {peerTyping ? <PeerTypingIndicator layout="header" displayName={peerTyping} /> : null}
                    </div>
                  </>
                ) : (
                  <div>
                    <h3 className="ph-msg-title" style={{ margin: 0 }}>
                      Conversation
                    </h3>
                    {peerTyping ? <PeerTypingIndicator layout="header" displayName={peerTyping} /> : null}
                  </div>
                )}
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

            {showIncomingRequest ? (
              <div className="ph-msg-request-bar" role="region" aria-label="Message request">
                <span className="ph-msg-request-bar-text">
                  <strong>Message request</strong> — reply here, tap Accept for full chat without messaging first, or
                  Decline.
                </span>
                <div className="ph-msg-request-bar-actions">
                  <button
                    type="button"
                    className="ph-btn ph-btn-primary"
                    style={{ fontSize: "0.82rem", padding: "0.28rem 0.75rem" }}
                    onClick={() => void acceptMessageRequest()}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="ph-btn ph-btn-ghost"
                    style={{ fontSize: "0.82rem", padding: "0.28rem 0.75rem" }}
                    onClick={() => void declineMessageRequest()}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : null}
            {showOutgoingPending ? (
              <div className="ph-msg-request-bar ph-msg-request-bar--pending" role="status">
                {dmLocked
                  ? "You've sent your one allowed intro. Wait for them to reply or accept to keep messaging."
                  : "Message request: you can send one intro. After they reply or accept, chat is unlimited."}
              </div>
            ) : null}
            {showDeclined ? (
              <div className="ph-msg-request-bar ph-msg-request-bar--declined" role="status">
                They declined your message request. You can chat again once you&apos;re friends.
              </div>
            ) : null}
            {showConversationPaused ? (
              <div className="ph-msg-request-bar ph-msg-request-bar--paused" role="status">
                This conversation is on hold until you&apos;re friends.
              </div>
            ) : null}

            {isAdoptionThread ? (
              <div
                className="ph-msg-request-bar"
                role="region"
                aria-label="Paw Adopt adoption"
                style={{ flexDirection: "column", alignItems: "stretch", gap: "0.55rem" }}
              >
                {adoptImShelter && adoptOutcome === "PENDING" && adoptListStatus === "ACTIVE" ? (
                  <>
                    <span className="ph-msg-request-bar-text">
                      <strong>Paw Adopt</strong> — When the adoption is final, <strong>Confirm adoption</strong> to
                      mark this pet as placed and close the listing. <strong>Decline</strong> if this home did not work
                      out; the pet can stay available for other adopters.
                    </span>
                    <div className="ph-msg-request-bar-actions">
                      <button
                        type="button"
                        className="ph-btn ph-btn-primary"
                        style={{ fontSize: "0.82rem", padding: "0.28rem 0.75rem" }}
                        disabled={adoptOutcomeBusy}
                        onClick={() => void runAdoptShelterOutcome("CONFIRM")}
                      >
                        {adoptOutcomeBusy ? "Saving…" : "Confirm adoption"}
                      </button>
                      <button
                        type="button"
                        className="ph-btn ph-btn-ghost"
                        style={{ fontSize: "0.82rem", padding: "0.28rem 0.75rem" }}
                        disabled={adoptOutcomeBusy}
                        onClick={() => void runAdoptShelterOutcome("DECLINE")}
                      >
                        Decline
                      </button>
                    </div>
                  </>
                ) : null}
                {adoptImShelter && adoptOutcome === "PENDING" && adoptListStatus !== "ACTIVE" ? (
                  <>
                    <span className="ph-msg-request-bar-text">
                      <strong>Paw Adopt</strong> — This pet is not listed as available (it may already be adopted).
                      Confirm is not available here. You can <strong>Decline</strong> to close this inquiry in your
                      records.
                    </span>
                    <div className="ph-msg-request-bar-actions">
                      <button
                        type="button"
                        className="ph-btn ph-btn-ghost"
                        style={{ fontSize: "0.82rem", padding: "0.28rem 0.75rem" }}
                        disabled={adoptOutcomeBusy}
                        onClick={() => void runAdoptShelterOutcome("DECLINE")}
                      >
                        {adoptOutcomeBusy ? "Saving…" : "Decline inquiry"}
                      </button>
                    </div>
                  </>
                ) : null}
                {adoptImShelter && adoptOutcome === "CONFIRMED" ? (
                  <div className="ph-msg-request-bar--pending" role="status" style={{ margin: 0, padding: "0.5rem 0" }}>
                    <span className="ph-msg-request-bar-text">
                      <strong>Paw Adopt</strong> — You confirmed this placement. The listing is closed as adopted.
                    </span>
                  </div>
                ) : null}
                {adoptImShelter && adoptOutcome === "DECLINED" ? (
                  <div className="ph-msg-request-bar--declined" role="status" style={{ margin: 0, padding: "0.5rem 0" }}>
                    <span className="ph-msg-request-bar-text">
                      <strong>Paw Adopt</strong> — You recorded that this placement did not go ahead. The inquirer was
                      notified.
                    </span>
                  </div>
                ) : null}
                {!adoptImShelter && adoptOutcome === "PENDING" && adoptListStatus === "ACTIVE" ? (
                  <div className="ph-msg-request-bar--pending" role="status" style={{ margin: 0 }}>
                    <span className="ph-msg-request-bar-text">
                      <strong>Paw Adopt</strong> — Waiting for the shelter to confirm adoption or say this inquiry
                      did not go through. When they confirm, the pet is no longer listed.
                    </span>
                  </div>
                ) : null}
                {!adoptImShelter && adoptOutcome === "PENDING" && adoptListStatus !== "ACTIVE" ? (
                  <div className="ph-msg-request-bar--pending" role="status" style={{ margin: 0 }}>
                    <span className="ph-msg-request-bar-text">
                      <strong>Paw Adopt</strong> — This listing is no longer available (the pet may already be placed).
                      You can still message the shelter below if you need closure.
                    </span>
                  </div>
                ) : null}
                {!adoptImShelter && adoptOutcome === "CONFIRMED" ? (
                  <div className="ph-msg-request-bar--pending" role="status" style={{ margin: 0 }}>
                    <span className="ph-msg-request-bar-text">
                      <strong>Paw Adopt</strong> — The shelter confirmed this adoption. The pet is no longer listed.
                    </span>
                  </div>
                ) : null}
                {!adoptImShelter && adoptOutcome === "DECLINED" ? (
                  <div className="ph-msg-request-bar--declined" role="status" style={{ margin: 0 }}>
                    <span className="ph-msg-request-bar-text">
                      <strong>Paw Adopt</strong> — The shelter could not place through this inquiry. Check the
                      listing — the pet may still be there for another adopter.
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!dmLocked &&
            user?.role !== "ADMIN" &&
            activeThread?.type === "LISTING" &&
            pawMarketCtx?.orderId != null ? (
              <div
                className="ph-msg-request-bar"
                role="region"
                aria-label="Paw Market order"
                style={{ flexDirection: "column", alignItems: "stretch", gap: "0.55rem" }}
              >
                <span className="ph-msg-request-bar-text">
                  <strong>Paw Market</strong>
                  {pawMarketCtx.listingTitle ? ` — ${pawMarketCtx.listingTitle}` : ""} · Qty {pawMarketCtx.quantity}
                  {pawMarketCtx.sellerStatus === "PENDING_SELLER"
                    ? " · Awaiting seller confirmation"
                    : " · Confirmed"}
                </span>
                {pawMarketErr ? (
                  <span style={{ color: "#b42318", fontSize: "0.82rem" }}>{pawMarketErr}</span>
                ) : null}
                {pawMarketCtx.viewerIsSeller && pawMarketCtx.sellerStatus === "PENDING_SELLER" ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
                    <button
                      type="button"
                      className="ph-btn ph-btn-primary"
                      style={{ fontSize: "0.8rem", padding: "0.28rem 0.75rem" }}
                      onClick={() => void pawMarketConfirm()}
                    >
                      Confirm sale
                    </button>
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost"
                      style={{ fontSize: "0.8rem", padding: "0.28rem 0.75rem" }}
                      onClick={() => void pawMarketDecline()}
                    >
                      Decline
                    </button>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}>
                      Qty
                      <input
                        className="ph-input"
                        style={{ width: 56, padding: "0.2rem 0.35rem", fontSize: "0.8rem" }}
                        value={qtyDraft}
                        onChange={(e) => setQtyDraft(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost"
                      style={{ fontSize: "0.8rem", padding: "0.28rem 0.75rem" }}
                      onClick={() => void pawMarketSaveQuantity()}
                    >
                      Update qty
                    </button>
                  </div>
                ) : null}
                {pawMarketCtx.viewerIsBuyer && pawMarketCtx.sellerStatus === "PENDING_SELLER" ? (
                  <span style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>
                    Waiting for the seller to confirm this order before you can leave a review.
                  </span>
                ) : null}
                {pawMarketCtx.buyerCanReview ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.82rem" }}>
                    <span>
                      <strong>Rate the seller</strong>
                    </span>
                    <div style={{ display: "flex", gap: "0.15rem" }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: "1.15rem",
                            color: s <= reviewRating ? "var(--color-primary-dark)" : "var(--color-muted)",
                          }}
                          onClick={() => setReviewRating(s)}
                          aria-label={`${s} stars`}
                        >
                          {s <= reviewRating ? "★" : "☆"}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="ph-input"
                      rows={2}
                      placeholder="Optional comment"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                    <button
                      type="button"
                      className="ph-btn ph-btn-primary"
                      style={{ fontSize: "0.8rem", padding: "0.28rem 0.75rem", alignSelf: "flex-start" }}
                      disabled={reviewBusy}
                      onClick={() => void pawMarketSubmitReview()}
                    >
                      {reviewBusy ? "Sending…" : "Submit review"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="ph-msg-scroll">
              {sorted.map((m) => {
                const mine = m.senderId === user.userId;
                const { text: bodyText, marketListingId, adoptionListingId } = m.body
                  ? parseMessageEmbeds(m.body)
                  : { text: "", marketListingId: null as number | null, adoptionListingId: null as number | null };
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
                        <button
                          type="button"
                          className="ph-msg-img-link"
                          onClick={() => openMedia(m.attachmentUrl!)}
                          aria-label="View attachment"
                        >
                          {inferMediaLightboxKind(m.attachmentUrl) === "video" ? (
                            <video
                              src={m.attachmentUrl}
                              muted
                              playsInline
                              preload="metadata"
                              className="ph-msg-img"
                            />
                          ) : (
                            <img src={m.attachmentUrl} alt="" className="ph-msg-img" />
                          )}
                        </button>
                      )}
                      {adoptionListingId != null ? (
                        <AdoptionListingShareEmbed listingId={adoptionListingId} mine={mine} />
                      ) : marketListingId != null ? (
                        <ListingShareEmbed listingId={marketListingId} mine={mine} />
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
              {peerTyping ? <PeerTypingIndicator layout="thread" displayName={peerTyping} /> : null}
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
                      setLiveCameraOpen(false);
                      if (fileRef.current) fileRef.current.value = "";
                      if (cameraRef.current) cameraRef.current.value = "";
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              {sendErr && <p className="ph-msg-err">{sendErr}</p>}
              <div className="ph-msg-compose-row">
                <input ref={fileRef} type="file" accept="image/*" className="ph-msg-file" onChange={onPickImageFromGallery} />
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="ph-msg-file"
                  onChange={onPickImageFromCamera}
                />
                <button
                  type="button"
                  className="ph-msg-icon-btn"
                  disabled={dmLocked || liveCameraBusy}
                  onClick={() => void openLiveCamera()}
                  title="Take a photo with camera"
                >
                  <Camera size={18} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  className="ph-msg-icon-btn"
                  disabled={dmLocked}
                  onClick={() => fileRef.current?.click()}
                  title="Attach image from gallery"
                >
                  <ImagePlus size={18} strokeWidth={1.8} />
                </button>
                <textarea
                  className="ph-msg-input"
                  rows={1}
                  value={compose}
                  disabled={dmLocked}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCompose(v);
                    scheduleComposerTyping(v.trim().length);
                  }}
                  onBlur={() => {
                    if (typingIdleRef.current) {
                      clearTimeout(typingIdleRef.current);
                      typingIdleRef.current = null;
                    }
                    if (validTid) sendTyping(tid, false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void onSend(e as unknown as FormEvent); }
                  }}
                  placeholder={dmLocked ? "Messaging locked until they accept or you're friends…" : "Write a message…"}
                />
                <button className="ph-msg-send" type="submit" title="Send" disabled={dmLocked}>
                  <Send size={16} strokeWidth={2} />
                </button>
              </div>
            </form>
            {liveCameraOpen ? (
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Take a photo"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 10060,
                  background: "rgba(0,0,0,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1rem",
                }}
                onClick={() => setLiveCameraOpen(false)}
              >
                <div
                  className="ph-surface"
                  style={{
                    maxWidth: 420,
                    width: "100%",
                    padding: "1rem",
                    borderRadius: 12,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "1rem" }}>Camera</span>
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost"
                      onClick={() => setLiveCameraOpen(false)}
                      aria-label="Close camera"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <video
                    ref={liveCameraVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      borderRadius: 10,
                      background: "#111",
                      maxHeight: "min(50vh, 360px)",
                      objectFit: "cover",
                    }}
                  />
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--color-muted)" }}>
                    Allow camera access when your browser asks. Preview is live; gallery is the other button.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.85rem" }}>
                    <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setLiveCameraOpen(false)}>
                      Cancel
                    </button>
                    <button type="button" className="ph-btn ph-btn-primary" onClick={captureLivePhoto}>
                      Use photo
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
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
            <p>Pick someone on the left, or tap + and open People to start a chat.</p>
          </div>
        ) : (
          chatPanel
        )}
      </section>
    </div>
  );
}
