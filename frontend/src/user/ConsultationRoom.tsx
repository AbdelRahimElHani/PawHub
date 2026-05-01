import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, FileText, Flag, Paperclip, Send, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { UserChip } from "../components/social/UserChip";
import { api, apiUrl, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useChatStomp } from "../chat/ChatStompContext";
import type { PawvetTriageCaseDto } from "../types/pawvetTriage";
import { useVetStore, type CaseChatMessage } from "../store/useVetStore";
import { PawvetTypingIndicator } from "./PawvetTypingIndicator";
import { useMediaLightbox } from "../components/media/MediaLightboxContext";
import { inferMediaLightboxKind } from "../components/media/inferMediaKind";
import "../pawvet/pawvet.css";

function formatAgeMonths(m: number | null | undefined): string {
  if (m == null) return "—";
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return mo ? `${y} yr ${mo} mo` : `${y} yr`;
}

function MessageAttachment({ m }: { m: CaseChatMessage }) {
  const { openMedia } = useMediaLightbox();
  if (!m.attachmentUrl) return null;
  const isPdf =
    m.attachmentKind === "pdf" ||
    /\.pdf(\?|$)/i.test(m.attachmentUrl) ||
    m.attachmentUrl.toLowerCase().includes("application/pdf");
  if (isPdf) {
    return (
      <button
        type="button"
        className="pawvet-chat-attach pawvet-chat-attach--pdf"
        onClick={() => openMedia(m.attachmentUrl!, "PDF attachment")}
      >
        <FileText size={18} strokeWidth={2} aria-hidden />
        Open PDF attachment
      </button>
    );
  }
  const kind = inferMediaLightboxKind(m.attachmentUrl);
  if (kind === "video") {
    return (
      <button
        type="button"
        className="pawvet-chat-attach pawvet-chat-attach--img"
        onClick={() => openMedia(m.attachmentUrl!)}
        aria-label="View video attachment"
      >
        <video
          src={m.attachmentUrl}
          muted
          playsInline
          preload="metadata"
          style={{ display: "block", maxWidth: "100%", maxHeight: 220, borderRadius: 10 }}
        />
      </button>
    );
  }
  return (
    <button
      type="button"
      className="pawvet-chat-attach pawvet-chat-attach--img"
      onClick={() => openMedia(m.attachmentUrl!)}
      aria-label="View image attachment"
    >
      <img src={m.attachmentUrl} alt="Attachment" />
    </button>
  );
}

export function ConsultationRoom() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { setActiveTriageCase, sendTriageTyping } = useChatStomp();
  const cases = useVetStore((s) => s.cases);
  const mergeCasesFromApi = useVetStore((s) => s.mergeCasesFromApi);

  const c = useMemo(() => (caseId ? cases.find((x) => x.id === caseId) : undefined), [cases, caseId]);
  const caseNum = useMemo(() => (caseId && Number.isFinite(Number(caseId)) ? Number(caseId) : NaN), [caseId]);

  const [body, setBody] = useState("");
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState<string | null>(null);
  const peerClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportToast, setReportToast] = useState(false);

  const isOwner = Boolean(user && c && user.userId === c.ownerUserId);
  const isVet = Boolean(user && c && user.userId === c.vetUserId);
  const closed = c?.status === "RESOLVED";
  const canChat = c?.status === "IN_PROGRESS" && (isOwner || isVet);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [c?.messages.length, peerTyping]);

  useEffect(() => {
    if (!caseId || !Number.isFinite(Number(caseId))) return;
    let cancelled = false;
    async function pull() {
      try {
        const dto = await api<PawvetTriageCaseDto>(`/api/pawvet/triage-cases/${caseId}`);
        if (!cancelled) mergeCasesFromApi([dto]);
      } catch {
        /* 403/404 — room still shows last local state if any */
      }
    }
    void pull();
    const t = window.setInterval(() => void pull(), 25000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [caseId, mergeCasesFromApi]);

  useEffect(() => {
    if (!user || !Number.isFinite(caseNum) || caseNum <= 0) {
      setActiveTriageCase(null, null);
      return;
    }
    if (c?.status !== "IN_PROGRESS") {
      setActiveTriageCase(null, null);
      return;
    }
    const myId = user.userId;
    setActiveTriageCase(caseNum, {
      onCaseUpdate: (raw) => {
        try {
          const dto = JSON.parse(raw) as PawvetTriageCaseDto;
          mergeCasesFromApi([dto]);
        } catch {
          /* ignore */
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
          peerClearRef.current = setTimeout(() => setPeerTyping(null), 4200);
        } else {
          setPeerTyping(null);
        }
      },
    });
    return () => {
      setActiveTriageCase(null, null);
      if (peerClearRef.current) {
        clearTimeout(peerClearRef.current);
        peerClearRef.current = null;
      }
      setPeerTyping(null);
    };
  }, [caseNum, user, c?.status, mergeCasesFromApi, setActiveTriageCase]);

  useEffect(() => {
    return () => {
      if (Number.isFinite(caseNum) && caseNum > 0) {
        sendTriageTyping(caseNum, false);
      }
      if (typingIdleRef.current) {
        clearTimeout(typingIdleRef.current);
        typingIdleRef.current = null;
      }
    };
  }, [caseNum, sendTriageTyping]);

  useEffect(() => {
    if (!closed || !isOwner || !caseId) return;
    const t = window.setTimeout(() => nav(`/pawvet/case/${caseId}/rate`, { replace: true }), 600);
    return () => window.clearTimeout(t);
  }, [closed, isOwner, nav, caseId]);

  const scheduleComposerTyping = useCallback(
    (textLen: number) => {
      if (!canChat || !Number.isFinite(caseNum) || caseNum <= 0) return;
      if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
      if (textLen > 0) {
        sendTriageTyping(caseNum, true);
        typingIdleRef.current = window.setTimeout(() => {
          sendTriageTyping(caseNum, false);
          typingIdleRef.current = null;
        }, 2800);
      } else {
        sendTriageTyping(caseNum, false);
      }
    },
    [canChat, caseNum, sendTriageTyping],
  );

  if (!caseId) {
    return <p className="pawvet-shell">Invalid case.</p>;
  }

  if (!c) {
    return (
      <div className="pawvet-shell">
        <p style={{ color: "var(--color-muted)" }}>Case not found. It may have been cleared from this browser&apos;s demo store.</p>
        <Link className="ph-btn ph-btn-primary" to="/pawvet">
          Back to PawVet
        </Link>
      </div>
    );
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    setSendErr(null);
    const text = body.trim();
    if (!text && !pendingFile) return;
    if (!canChat || !Number.isFinite(caseNum) || caseNum <= 0) return;
    if (typingIdleRef.current) {
      clearTimeout(typingIdleRef.current);
      typingIdleRef.current = null;
    }
    sendTriageTyping(caseNum, false);

    try {
      let attachmentUrl: string | undefined;
      let attachmentKind: "image" | "pdf" | undefined;
      if (pendingFile) {
        const fd = new FormData();
        fd.append("file", pendingFile);
        const auth = getToken();
        const headers: HeadersInit = {};
        if (auth) headers.Authorization = `Bearer ${auth}`;
        const res = await fetch(apiUrl(`/api/pawvet/triage-cases/${caseNum}/message-media`), {
          method: "POST",
          headers,
          body: fd,
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          throw new Error(j.error ?? j.message ?? res.statusText);
        }
        const j = (await res.json()) as { url: string };
        attachmentUrl = j.url;
        attachmentKind = pendingFile.type === "application/pdf" ? "pdf" : "image";
      }
      if (!text && !attachmentUrl) return;

      const dto = await api<PawvetTriageCaseDto>(`/api/pawvet/triage-cases/${caseNum}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: text,
          attachmentUrl: attachmentUrl ?? null,
          attachmentKind: attachmentKind ?? null,
        }),
      });
      mergeCasesFromApi([dto]);
      setBody("");
      if (pendingPreview?.startsWith("blob:")) URL.revokeObjectURL(pendingPreview);
      setPendingFile(null);
      setPendingPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setSendErr(err instanceof Error ? err.message : "Send failed");
    }
  }

  function onPickFile() {
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setPendingFile(null);
      setPendingPreview(null);
      return;
    }
    const ok = f.type.startsWith("image/") || f.type === "application/pdf";
    if (!ok) {
      setSendErr("Please choose an image or a PDF.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setSendErr(null);
    setPendingFile(f);
    if (f.type.startsWith("image/")) {
      setPendingPreview(URL.createObjectURL(f));
    } else {
      setPendingPreview(null);
    }
    scheduleComposerTyping(1);
  }

  function submitReport() {
    void (async () => {
      if (!c || !user || !c.vetUserId || !reportReason.trim()) return;
      setSendErr(null);
      try {
        await api(`/api/pawvet/triage-cases/${c.id}/report-vet`, {
          method: "POST",
          body: JSON.stringify({ reason: reportReason.trim() }),
        });
        setReportOpen(false);
        setReportReason("");
        setReportToast(true);
        window.setTimeout(() => setReportToast(false), 4500);
      } catch (e: unknown) {
        setSendErr(e instanceof Error ? e.message : "Report failed");
      }
    })();
  }

  return (
    <div className="pawvet-shell">
      {reportToast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "1.25rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 90,
            padding: "0.65rem 1.1rem",
            borderRadius: 10,
            background: "var(--color-primary-dark)",
            color: "#fff",
            fontSize: "0.9rem",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          Report submitted. Our team will review it.
        </div>
      ) : null}
      <header
        className="pawvet-glass-card"
        style={{
          padding: "0.85rem 1rem",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <Link className="ph-btn ph-btn-ghost" to="/pawvet" style={{ fontSize: "0.85rem" }}>
          ← PawVet
        </Link>
        {c.vetName && c.vetUserId ? (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                <UserChip userId={c.vetUserId} displayName={c.vetName} avatarUrl={c.vetAvatarUrl ?? null} />
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "0.12rem 0.45rem",
                    borderRadius: 999,
                    background: "#ecfdf5",
                    color: "#065f46",
                    border: "1px solid #6ee7b7",
                  }}
                >
                  <BadgeCheck size={12} aria-hidden />
                  Verified
                </span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>Case: {c.catName}</div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1 }}>
            <strong style={{ color: "var(--color-primary-dark)" }}>Waiting for a vet</strong>
            <div style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>Your case is visible on the triage board.</div>
          </div>
        )}

        {isOwner && c.vetUserId ? (
          <button type="button" className="ph-btn ph-btn-ghost" style={{ color: "#b42318", marginLeft: "auto" }} onClick={() => setReportOpen(true)}>
            <Flag size={16} aria-hidden style={{ marginRight: 6 }} />
            Report vet
          </button>
        ) : null}
        {isVet && canChat ? (
          <Link className="ph-btn ph-btn-primary" style={{ marginLeft: isOwner && c.vetUserId ? "0.5rem" : "auto", fontSize: "0.85rem" }} to={`/vet/case/${caseId}/resolve`}>
            Close case
          </Link>
        ) : null}
      </header>

      {isVet ? (
        <div
          className="pawvet-glass-card"
          style={{
            padding: "0.65rem 1rem",
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase" }}>
            Guardian
          </span>
          <UserChip userId={c.ownerUserId} displayName={c.ownerDisplayName ?? "Pet parent"} avatarUrl={c.ownerAvatarUrl ?? null} />
        </div>
      ) : null}

      {c.catSnapshot ? (
        <div className="pawvet-glass-card" style={{ padding: "0.85rem 1rem", marginBottom: "0.75rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          {c.catSnapshot.primaryPhotoUrl ? (
            <img
              src={c.catSnapshot.primaryPhotoUrl}
              alt=""
              style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", border: "1px solid var(--color-border)" }}
            />
          ) : null}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 4 }}>
              Cat on file ({c.catSnapshot.source === "sanctuary" ? "from My Cats" : "details you entered"})
            </div>
            <strong style={{ color: "var(--color-primary-dark)" }}>{c.catSnapshot.name}</strong>
            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginTop: 6, lineHeight: 1.45 }}>
              <span>Breed: {c.catSnapshot.breed ?? "—"}</span>
              {" · "}
              <span>Age: {formatAgeMonths(c.catSnapshot.ageMonths)}</span>
              {" · "}
              <span>Sex: {c.catSnapshot.gender === "MALE" ? "Male" : c.catSnapshot.gender === "FEMALE" ? "Female" : "—"}</span>
              {c.catSnapshot.birthday ? (
                <>
                  {" · "}
                  <span>Birthday: {c.catSnapshot.birthday}</span>
                </>
              ) : null}
            </div>
            {c.catSnapshot.bio ? <p style={{ margin: "0.5rem 0 0", fontSize: "0.88rem", color: "var(--color-primary-dark)" }}>{c.catSnapshot.bio}</p> : null}
          </div>
        </div>
      ) : null}

      {c.attachments?.length ? (
        <div className="pawvet-glass-card" style={{ padding: "0.85rem 1rem", marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "0.5rem" }}>Case photos & videos</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {c.attachments.map((a) =>
              a.kind === "image" ? (
                a.publicUrl || a.dataUrl ? (
                  <a
                    key={a.id}
                    href={a.publicUrl ?? a.dataUrl}
                    download={a.fileName}
                    target={a.publicUrl ? "_blank" : undefined}
                    rel={a.publicUrl ? "noreferrer" : undefined}
                    style={{ display: "block" }}
                  >
                    <img
                      src={a.publicUrl ?? a.dataUrl}
                      alt={a.fileName}
                      style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 10, border: "1px solid var(--color-border)" }}
                    />
                  </a>
                ) : (
                  <div
                    key={a.id}
                    className="ph-surface"
                    style={{
                      width: 96,
                      height: 96,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.35rem",
                      borderRadius: 10,
                      fontSize: "0.72rem",
                      color: "var(--color-muted)",
                      textAlign: "center",
                    }}
                    title={a.fileName}
                  >
                    Image (preview unavailable after page reload)
                  </div>
                )
              ) : a.publicUrl || a.dataUrl ? (
                <div key={a.id} style={{ width: 160, maxWidth: "100%" }}>
                  <video
                    src={a.publicUrl ?? a.dataUrl}
                    controls
                    style={{ width: "100%", borderRadius: 10, border: "1px solid var(--color-border)" }}
                    playsInline
                  />
                  <div style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: 4 }}>{a.fileName}</div>
                </div>
              ) : (
                <div key={a.id} className="ph-surface" style={{ padding: "0.5rem", borderRadius: 10, maxWidth: 160, fontSize: "0.78rem", color: "var(--color-muted)" }}>
                  Video: {a.fileName} (preview unavailable after page reload)
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      <div className="pawvet-glass-card" style={{ padding: "1rem", minHeight: 320, maxHeight: "min(58vh, 520px)", overflowY: "auto", marginBottom: "1rem" }}>
        <AnimatePresence initial={false}>
          {c.messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: m.sender === "user" ? 12 : m.sender === "vet" ? -12 : 0 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22 }}
              style={{ marginBottom: "0.65rem", display: "flex", flexDirection: "column" }}
            >
              <div
                className={
                  m.sender === "user"
                    ? "pawvet-chat-bubble pawvet-chat-bubble--user"
                    : m.sender === "vet"
                      ? "pawvet-chat-bubble pawvet-chat-bubble--vet"
                      : "pawvet-chat-bubble pawvet-chat-bubble--system"
                }
              >
                {m.body.trim() ? (
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                ) : null}
                <MessageAttachment m={m} />
              </div>
              <span
                style={{
                  fontSize: "0.68rem",
                  color: "var(--color-muted)",
                  alignSelf: m.sender === "user" ? "flex-end" : m.sender === "vet" ? "flex-start" : "center",
                }}
              >
                {new Date(m.at).toLocaleString()}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {peerTyping ? <PawvetTypingIndicator displayName={peerTyping} /> : null}
        <div ref={bottomRef} />
      </div>

      {closed && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", color: "var(--color-muted)" }}>
          Redirecting to rating…
        </motion.p>
      )}

      {canChat ? (
        <form onSubmit={send} className="pawvet-glass-card pawvet-compose" style={{ padding: "0.65rem 0.75rem" }}>
          {pendingFile ? (
            <div className="pawvet-compose-pending">
              {pendingPreview ? (
                <img src={pendingPreview} alt="" />
              ) : (
                <div style={{ width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={28} strokeWidth={1.75} aria-hidden style={{ color: "var(--pawvet-medical)" }} />
                </div>
              )}
              <span className="pawvet-compose-pending-meta">{pendingFile.name}</span>
              <button
                type="button"
                className="ph-btn ph-btn-ghost"
                style={{ fontSize: "0.78rem", padding: "0.2rem 0.45rem" }}
                onClick={() => {
                  if (pendingPreview?.startsWith("blob:")) URL.revokeObjectURL(pendingPreview);
                  setPendingFile(null);
                  setPendingPreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          ) : null}
          {sendErr ? (
            <p role="alert" style={{ color: "#b42318", margin: 0, fontSize: "0.85rem" }}>
              {sendErr}
            </p>
          ) : null}
          <div className="pawvet-compose-row">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="pawvet-compose-file"
              onChange={onPickFile}
            />
            <button
              type="button"
              className="pawvet-compose-icon"
              disabled={!canChat}
              title="Attach image or PDF"
              aria-label="Attach image or PDF"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={18} strokeWidth={2} aria-hidden />
            </button>
            <textarea
              className="ph-textarea"
              rows={2}
              value={body}
              onChange={(e) => {
                const v = e.target.value;
                setBody(v);
                scheduleComposerTyping(v.trim().length + (pendingFile ? 1 : 0));
              }}
              onBlur={() => {
                if (typingIdleRef.current) {
                  clearTimeout(typingIdleRef.current);
                  typingIdleRef.current = null;
                }
                if (Number.isFinite(caseNum) && caseNum > 0) sendTriageTyping(caseNum, false);
              }}
              placeholder={isVet ? "Professional guidance… (optional caption with attachment)" : "Reply to your vet…"}
              style={{ flex: 1, margin: 0, resize: "none" }}
            />
            <button type="submit" className="ph-btn ph-btn-primary" disabled={!body.trim() && !pendingFile} title="Send">
              <Send size={18} aria-hidden />
            </button>
          </div>
        </form>
      ) : c.status === "OPEN" ? (
        <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>You&apos;ll be able to chat once a vet claims this case.</p>
      ) : null}

      {reportOpen ? (
        <div
          role="dialog"
          aria-modal
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: "1rem",
          }}
          onClick={() => setReportOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 400, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)", boxShadow: "var(--shadow-soft)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 0.5rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>Report veterinarian</h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "var(--color-muted)" }}>Admins will review this report.</p>
            <textarea
              className="ph-textarea"
              rows={4}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Describe the issue…"
              style={{ width: "100%", marginBottom: "0.75rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setReportOpen(false)}>
                Cancel
              </button>
              <button type="button" className="ph-btn ph-btn-primary" style={{ background: "#b42318", borderColor: "#b42318" }} onClick={() => submitReport()}>
                Submit report
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
