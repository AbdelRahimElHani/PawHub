import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, FileText, Image as ImageIcon, MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { isAdminAccount } from "../auth/vetAccess";
import type { VetApplicationMetricsDto, VetLicenseApplicationAdminDto } from "../types";
import "../pawvet/pawvet.css";

function looksLikeImageUrl(url: string): boolean {
  try {
    const p = new URL(url, window.location.origin).pathname.toLowerCase();
    return /\.(jpe?g|png|gif|webp|bmp|heic|svg)(\?|$)/i.test(p);
  } catch {
    return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url.toLowerCase());
  }
}

function looksLikePdfUrl(url: string): boolean {
  try {
    const p = new URL(url, window.location.origin).pathname.toLowerCase();
    return /\.pdf(\?|$)/i.test(p);
  } catch {
    return /\.pdf(\?|$)/i.test(url.toLowerCase());
  }
}

function verificationStatusLabel(status: string): string {
  if (status === "PENDING") return "Pending verification";
  if (status === "APPROVED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return status;
}

function verificationStatusShort(status: string): string {
  if (status === "PENDING") return "Pending";
  if (status === "APPROVED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return status;
}

function StatusBadge({ status }: { status: string }) {
  const label = verificationStatusShort(status);
  const bg =
    status === "APPROVED"
      ? "rgba(22, 163, 74, 0.14)"
      : status === "REJECTED"
        ? "rgba(180, 35, 24, 0.12)"
        : "rgba(217, 119, 6, 0.14)";
  const color =
    status === "APPROVED" ? "#15803d" : status === "REJECTED" ? "#b42318" : "#b45309";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "0.65rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "0.15rem 0.45rem",
        borderRadius: 999,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function appealSummaryCompact(app: VetLicenseApplicationAdminDto) {
  if (app.appealState === "PENDING" && (app.appealMessage || app.appealSubmittedAt)) {
    return (
      <span
        style={{ fontSize: "0.72rem", fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.02em" }}
        title={[app.appealSubmittedAt ? new Date(app.appealSubmittedAt).toLocaleString() : "", app.appealMessage ?? ""].filter(Boolean).join("\n")}
      >
        Appeal
      </span>
    );
  }
  if (app.appealState === "REJECTED_FINAL") {
    return (
      <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }} title="Appeal closed">
        Closed
      </span>
    );
  }
  return <span style={{ color: "var(--color-muted)" }}>—</span>;
}

function DocIconLinks({ urls }: { urls: string[] }) {
  const list = urls ?? [];
  if (list.length === 0) {
    return <span style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>—</span>;
  }
  const max = 6;
  const shown = list.slice(0, max);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
      {shown.map((url, i) => {
        const img = looksLikeImageUrl(url);
        const pdf = looksLikePdfUrl(url);
        return (
          <a
            key={`${url}-${i}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open document ${i + 1}`}
            className="ph-btn ph-btn-ghost"
            style={{
              padding: "0.2rem 0.35rem",
              minWidth: "auto",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {img ? <ImageIcon size={15} aria-hidden /> : pdf ? <FileText size={15} aria-hidden /> : <ExternalLink size={15} aria-hidden />}
          </a>
        );
      })}
      {list.length > max ? (
        <span style={{ fontSize: "0.68rem", color: "var(--color-muted)", fontWeight: 600 }}>+{list.length - max}</span>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 160px) 1fr",
        gap: "0.5rem 1rem",
        padding: "0.45rem 0",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)" }}>{label}</span>
      <span style={{ fontSize: "0.92rem", color: "var(--color-primary-dark)", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function FullApplicationDialog({
  app,
  onClose,
  onApprove,
  onReject,
  showApproveReject,
}: {
  app: VetLicenseApplicationAdminDto;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (app: VetLicenseApplicationAdminDto) => void;
  showApproveReject: boolean;
}) {
  const docs = app.supportingDocumentUrls ?? [];

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="vet-app-detail-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 70,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ph-surface"
        style={{
          maxWidth: 720,
          width: "100%",
          maxHeight: "min(92vh, 900px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-soft)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "1rem 1.15rem",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div>
            <h2 id="vet-app-detail-title" style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-primary-dark)" }}>
              Application review
            </h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-muted)" }}>
              Application #{app.id} · User ID {app.userId}
            </p>
          </div>
          <button type="button" className="ph-btn ph-btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "1rem 1.15rem", flex: 1 }}>
          <div style={{ margin: "0 0 1.25rem" }}>
            <DetailRow label="Display name" value={app.displayName} />
            <DetailRow label="Email" value={app.email} />
            <DetailRow label="License number" value={app.licenseNumber} />
            <DetailRow label="University" value={app.university} />
            <DetailRow label="Years experience" value={app.yearsExperience != null ? String(app.yearsExperience) : "—"} />
            <DetailRow label="Phone" value={app.phone ?? "—"} />
            <DetailRow label="Status" value={verificationStatusLabel(app.status)} />
            <DetailRow label="Submitted" value={new Date(app.createdAt).toLocaleString()} />
            {app.rejectionReason ? <DetailRow label="Rejection reason" value={app.rejectionReason} /> : null}
            {app.appealState === "PENDING" && app.appealMessage ? <DetailRow label="Appeal" value={app.appealMessage} /> : null}
          </div>

          <h3
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--color-muted)",
              letterSpacing: "0.04em",
            }}
          >
            Professional bio
          </h3>
          <div
            className="ph-surface"
            style={{
              padding: "0.65rem",
              marginBottom: "1rem",
              fontSize: "0.85rem",
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
              color: "var(--color-primary-dark)",
              maxHeight: 140,
              overflowY: "auto",
            }}
          >
            {app.professionalBio?.trim() ? app.professionalBio : "—"}
          </div>

          <h3
            style={{
              margin: "0 0 0.65rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--color-muted)",
              letterSpacing: "0.04em",
            }}
          >
            Supporting documents ({docs.length})
          </h3>
          {docs.length === 0 ? (
            <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>No files were uploaded with this application.</p>
          ) : (
            <div style={{ marginBottom: "1.25rem" }}>
              <DocIconLinks urls={docs} />
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "var(--color-muted)" }}>Icons open each file in a new tab (no inline preview).</p>
            </div>
          )}
        </div>

        {showApproveReject ? (
          <div style={{ padding: "0.85rem 1.15rem", borderTop: "1px solid var(--color-border)", display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="ph-btn ph-btn-ghost" style={{ color: "#b42318" }} onClick={() => onReject(app)}>
              Reject…
            </button>
            <button type="button" className="ph-btn ph-btn-accent" onClick={() => onApprove(app.id)}>
              <Check size={16} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
              Approve
            </button>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

type QueueTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "APPEALS";

const TAB_ORDER: QueueTab[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "APPEALS"];

function tabButtonLabel(t: QueueTab): string {
  if (t === "ALL") return "All";
  if (t === "PENDING") return "Pending";
  if (t === "APPROVED") return "Accepted";
  if (t === "REJECTED") return "Rejected";
  return "Appeals";
}

export function VetVerificationQueue() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<QueueTab>("ALL");
  const [rows, setRows] = useState<VetLicenseApplicationAdminDto[]>([]);
  const [metrics, setMetrics] = useState<VetApplicationMetricsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<VetLicenseApplicationAdminDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailApp, setDetailApp] = useState<VetLicenseApplicationAdminDto | null>(null);
  const [rejectAppealFor, setRejectAppealFor] = useState<VetLicenseApplicationAdminDto | null>(null);
  const [rejectAppealNote, setRejectAppealNote] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const m = await api<VetApplicationMetricsDto>("/api/admin/vet-applications/metrics");
      setMetrics(m);
      let path = "/api/admin/vet-applications/all";
      if (tab === "PENDING") {
        path = "/api/admin/vet-applications/pending";
      } else if (tab === "APPROVED" || tab === "REJECTED") {
        path = `/api/admin/vet-applications/by-status?status=${tab}`;
      } else if (tab === "APPEALS") {
        path = "/api/admin/vet-applications/appeals-pending";
      }
      const list = await api<VetLicenseApplicationAdminDto[]>(path);
      setRows(list);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: number) {
    setErr(null);
    try {
      await api(`/api/admin/vet-applications/${id}/approve`, { method: "POST" });
      setDetailApp((cur) => (cur?.id === id ? null : cur));
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Approve failed");
    }
  }

  async function confirmReject() {
    if (!rejectFor || !rejectReason.trim()) return;
    setErr(null);
    try {
      await api(`/api/admin/vet-applications/${rejectFor.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const rid = rejectFor.id;
      setRejectFor(null);
      setRejectReason("");
      setDetailApp((cur) => (cur?.id === rid ? null : cur));
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    }
  }

  async function acceptAppeal(id: number) {
    setErr(null);
    try {
      await api(`/api/admin/vet-applications/${id}/appeal/accept`, { method: "POST" });
      setDetailApp((cur) => (cur?.id === id ? null : cur));
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Accept appeal failed");
    }
  }

  async function confirmRejectAppeal() {
    if (!rejectAppealFor) return;
    setErr(null);
    try {
      await api(`/api/admin/vet-applications/${rejectAppealFor.id}/appeal/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectAppealNote.trim() || null }),
      });
      const rid = rejectAppealFor.id;
      setRejectAppealFor(null);
      setRejectAppealNote("");
      setDetailApp((cur) => (cur?.id === rid ? null : cur));
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Reject appeal failed");
    }
  }

  function openReject(app: VetLicenseApplicationAdminDto) {
    setDetailApp(null);
    setRejectFor(app);
  }

  async function openDm(userId: number) {
    setErr(null);
    try {
      const r = await api<{ threadId: number }>(`/api/chat/dm/${userId}`, { method: "POST" });
      nav(`/messages/${r.threadId}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not open messages");
    }
  }

  const total = metrics?.total ?? 0;
  const verifiedCount = metrics?.approved ?? 0;
  const pawvetBack = "/pawvet";

  return (
    <div className="pawvet-shell">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.45rem", color: "var(--color-primary-dark)" }}>Vet verification</h1>
          <p style={{ margin: "0.35rem 0 0", color: "var(--color-muted)" }}>Review applications, appeals, and credential status.</p>
        </div>
        <Link className="ph-btn ph-btn-ghost" to={pawvetBack}>
          PawVet{isAdminAccount(user) ? " admin" : ""}
        </Link>
      </div>

      {err ? (
        <p style={{ color: "#b42318", marginBottom: "1rem" }} role="alert">
          {err}
        </p>
      ) : null}

      <div className="pawvet-stat-bar" style={{ marginBottom: "1rem" }}>
        <motion.div className="pawvet-stat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
          <span>Total applications</span>
          <strong>{total}</strong>
        </motion.div>
        <motion.div className="pawvet-stat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <span>Verified</span>
          <strong>{verifiedCount}</strong>
        </motion.div>
        <motion.div className="pawvet-stat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <span>Pending review</span>
          <strong>{metrics?.pending ?? "—"}</strong>
        </motion.div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
        {TAB_ORDER.map((t) => (
          <motion.button
            key={t}
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
            className={tab === t ? "ph-btn ph-btn-primary" : "ph-btn ph-btn-ghost"}
            style={{ fontSize: "0.85rem" }}
            onClick={() => {
              setRows([]);
              setTab(t);
            }}
          >
            {tabButtonLabel(t)}
          </motion.button>
        ))}
        <Link className="ph-btn ph-btn-ghost" style={{ fontSize: "0.85rem", marginLeft: "auto" }} to="/pawvet/admin/pawvet-reports">
          Vet reports
        </Link>
      </div>

      <div className="pawvet-glass-card" style={{ padding: 0, overflow: "hidden", minHeight: 160 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            role="region"
            aria-busy={loading}
            aria-label={`${tabButtonLabel(tab)} applications`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: loading ? 0.5 : 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflowX: "auto" }}
          >
            <table className="pawvet-table pawvet-table--compact">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Status</th>
                  <th>License #</th>
                  <th>Files</th>
                  <th>Submitted</th>
                  <th>Appeal</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "1.25rem", color: "var(--color-muted)", textAlign: "center" }}>
                      {loading ? "Loading…" : "No rows in this view."}
                    </td>
                  </tr>
                ) : (
                  rows.map((app) => {
                    const showAppealActions = tab === "APPEALS" || (tab === "ALL" && app.appealState === "PENDING");
                    const showPendingActions = app.status === "PENDING" && (tab === "PENDING" || tab === "ALL");
                    return (
                      <tr key={app.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <Link to={`/users/${app.userId}`} title="Public profile" style={{ flexShrink: 0 }}>
                              {app.avatarUrl ? (
                                <img
                                  src={app.avatarUrl}
                                  alt=""
                                  width={32}
                                  height={32}
                                  style={{ borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-border)" }}
                                />
                              ) : (
                                <span
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    background: "#eef6f4",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    color: "var(--color-primary-dark)",
                                  }}
                                >
                                  {app.displayName.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </Link>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: "0.82rem", lineHeight: 1.2 }}>{app.displayName}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={app.status} />
                        </td>
                        <td style={{ fontSize: "0.78rem", color: "var(--color-primary-dark)", maxWidth: 120 }} title={app.licenseNumber}>
                          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {app.licenseNumber}
                          </span>
                        </td>
                        <td>
                          <DocIconLinks urls={app.supportingDocumentUrls ?? []} />
                        </td>
                        <td style={{ fontSize: "0.75rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                          {new Date(app.createdAt).toLocaleDateString()}
                        </td>
                        <td>{appealSummaryCompact(app)}</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="ph-btn ph-btn-ghost"
                            style={{ fontSize: "0.82rem", padding: "0.25rem 0.45rem" }}
                            title="Message applicant"
                            onClick={() => void openDm(app.userId)}
                          >
                            <MessageCircle size={14} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="ph-btn ph-btn-primary"
                            style={{ fontSize: "0.82rem", padding: "0.25rem 0.55rem", marginLeft: 4 }}
                            onClick={() => setDetailApp(app)}
                          >
                            <FileText size={14} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
                            View
                          </button>
                          {showAppealActions ? (
                            <>
                              <button type="button" className="ph-btn ph-btn-accent" style={{ fontSize: "0.82rem", marginLeft: 6 }} onClick={() => void acceptAppeal(app.id)}>
                                Accept appeal
                              </button>
                              <button
                                type="button"
                                className="ph-btn ph-btn-ghost"
                                style={{ fontSize: "0.82rem", marginLeft: 6, color: "#b42318" }}
                                onClick={() => {
                                  setRejectAppealFor(app);
                                  setRejectAppealNote("");
                                }}
                              >
                                Reject appeal
                              </button>
                            </>
                          ) : null}
                          {showPendingActions ? (
                            <>
                              <button type="button" className="ph-btn ph-btn-accent" style={{ fontSize: "0.82rem", marginLeft: 6 }} onClick={() => void approve(app.id)}>
                                <Check size={14} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
                                Approve
                              </button>
                              <button type="button" className="ph-btn ph-btn-ghost" style={{ fontSize: "0.82rem", marginLeft: 6, color: "#b42318" }} onClick={() => openReject(app)}>
                                <X size={14} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
                                Reject
                              </button>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </motion.div>
        </AnimatePresence>
      </div>

      {detailApp ? (
        <FullApplicationDialog
          app={detailApp}
          onClose={() => setDetailApp(null)}
          onApprove={(id) => void approve(id)}
          onReject={(a) => openReject(a)}
          showApproveReject={detailApp.status === "PENDING"}
        />
      ) : null}

      {rejectFor ? (
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
            zIndex: 80,
            padding: "1rem",
          }}
          onClick={() => setRejectFor(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 440, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 0.5rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>Reject application</h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "var(--color-muted)" }}>
              {rejectFor.displayName} — explain why credentials could not be verified.
            </p>
            <textarea
              className="ph-textarea"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
              style={{ width: "100%", marginBottom: "0.75rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setRejectFor(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="ph-btn ph-btn-primary"
                style={{ background: "#b42318", borderColor: "#b42318" }}
                onClick={() => void confirmReject()}
                disabled={!rejectReason.trim()}
              >
                Reject application
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {rejectAppealFor ? (
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
            zIndex: 85,
            padding: "1rem",
          }}
          onClick={() => setRejectAppealFor(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 440, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 0.5rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>Reject appeal</h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "var(--color-muted)" }}>
              The veterinarian cannot submit another appeal after this decision.
            </p>
            <textarea
              className="ph-textarea"
              rows={3}
              value={rejectAppealNote}
              onChange={(e) => setRejectAppealNote(e.target.value)}
              placeholder="Optional note to include with the notification…"
              style={{ width: "100%", marginBottom: "0.75rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setRejectAppealFor(null)}>
                Cancel
              </button>
              <button type="button" className="ph-btn ph-btn-primary" style={{ background: "#b42318", borderColor: "#b42318" }} onClick={() => void confirmRejectAppeal()}>
                Reject appeal
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
