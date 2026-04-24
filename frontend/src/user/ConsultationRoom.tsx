import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Flag, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { PawvetTriageCaseDto } from "../types/pawvetTriage";
import { useVetStore } from "../store/useVetStore";
import "../pawvet/pawvet.css";

function formatAgeMonths(m: number | null | undefined): string {
  if (m == null) return "—";
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return mo ? `${y} yr ${mo} mo` : `${y} yr`;
}

export function ConsultationRoom() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const cases = useVetStore((s) => s.cases);
  const mergeCasesFromApi = useVetStore((s) => s.mergeCasesFromApi);
  const reportVet = useVetStore((s) => s.reportVet);

  const c = useMemo(() => (caseId ? cases.find((x) => x.id === caseId) : undefined), [cases, caseId]);
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const isOwner = Boolean(user && c && user.userId === c.ownerUserId);
  const isVet = Boolean(user && c && user.userId === c.vetUserId);
  const closed = c?.status === "RESOLVED";
  const canChat = c?.status === "IN_PROGRESS" && (isOwner || isVet);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [c?.messages.length]);

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
    const t = window.setInterval(() => void pull(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [caseId, mergeCasesFromApi]);

  useEffect(() => {
    if (!closed || !isOwner || !caseId) return;
    const t = window.setTimeout(() => nav(`/pawvet/case/${caseId}/rate`, { replace: true }), 600);
    return () => window.clearTimeout(t);
  }, [closed, isOwner, nav, caseId]);

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
    if (!body.trim() || !canChat || !caseId) return;
    const id = Number(caseId);
    if (!Number.isFinite(id)) return;
    try {
      const dto = await api<PawvetTriageCaseDto>(`/api/pawvet/triage-cases/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      });
      mergeCasesFromApi([dto]);
      setBody("");
    } catch {
      /* keep draft */
    }
  }

  function submitReport() {
    if (!c || !user || !c.vetUserId || !reportReason.trim()) return;
    reportVet({
      caseId: c.id,
      vetUserId: c.vetUserId,
      reporterUserId: user.userId,
      reason: reportReason.trim(),
    });
    setReportOpen(false);
    setReportReason("");
  }

  return (
    <div className="pawvet-shell">
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
        {c.vetName ? (
          <>
            {c.vetAvatarUrl ? (
              <img
                src={c.vetAvatarUrl}
                alt=""
                style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-border)" }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "var(--hub-sage-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                }}
              >
                🐾
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                <strong style={{ color: "var(--color-primary-dark)" }}>{c.vetName}</strong>
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
      </header>

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
                {m.body}
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
        <div ref={bottomRef} />
      </div>

      {closed && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", color: "var(--color-muted)" }}>
          Redirecting to rating…
        </motion.p>
      )}

      {canChat ? (
        <form onSubmit={send} className="pawvet-glass-card" style={{ padding: "0.65rem 0.75rem", display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <textarea
            className="ph-textarea"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isVet ? "Professional guidance…" : "Reply to your vet…"}
            style={{ flex: 1, margin: 0, resize: "none" }}
          />
          <button type="submit" className="ph-btn ph-btn-primary" disabled={!body.trim()}>
            <Send size={18} aria-hidden />
          </button>
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
