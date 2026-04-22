import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, ExternalLink, FileText, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isAdminAccount } from "../auth/vetAccess";
import { api } from "../api/client";
import type { VetApplicationMetricsDto, VetLicenseApplicationAdminDto } from "../types";
import "../pawvet/pawvet.css";

function downloadCredentials(app: VetLicenseApplicationAdminDto) {
  const docLines = (app.supportingDocumentUrls ?? []).map((u) => ` - ${u}`).join("\n");
  const text = `PawVet — License application\n\nName: ${app.displayName}\nEmail: ${app.email}\nUser ID: ${app.userId}\nLicense: ${app.licenseNumber}\nUniversity: ${app.university}\nYears experience: ${app.yearsExperience ?? "—"}\nPhone: ${app.phone ?? "—"}\nNotes:\n${app.professionalBio ?? "—"}\nSubmitted: ${app.createdAt}\n\nUploaded documents:\n${docLines || " (none listed)\n"}`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vet-application-${app.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 160px) 1fr", gap: "0.5rem 1rem", padding: "0.45rem 0", borderBottom: "1px solid var(--color-border)" }}>
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
}: {
  app: VetLicenseApplicationAdminDto;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (app: VetLicenseApplicationAdminDto) => void;
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
        <div style={{ padding: "1rem 1.15rem", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <h2 id="vet-app-detail-title" style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-primary-dark)" }}>
              Full application
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
            <DetailRow label="Status" value={app.status} />
            <DetailRow label="Submitted" value={new Date(app.createdAt).toLocaleString()} />
            {app.rejectionReason ? <DetailRow label="Rejection reason" value={app.rejectionReason} /> : null}
          </div>

          <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)", letterSpacing: "0.04em" }}>
            Professional bio
          </h3>
          <div
            className="ph-surface"
            style={{
              padding: "0.75rem",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              color: "var(--color-primary-dark)",
            }}
          >
            {app.professionalBio?.trim() ? app.professionalBio : "—"}
          </div>

          <h3 style={{ margin: "0 0 0.65rem", fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)", letterSpacing: "0.04em" }}>
            Supporting documents ({docs.length})
          </h3>
          {docs.length === 0 ? (
            <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>No files were uploaded with this application.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              {docs.map((url, i) => (
                <li key={`${url}-${i}`} className="pawvet-glass-card" style={{ padding: "0.75rem", border: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-muted)", marginBottom: "0.35rem" }}>Document {i + 1}</div>
                  <div style={{ fontSize: "0.75rem", wordBreak: "break-all", color: "var(--color-muted)", marginBottom: "0.5rem" }}>{url}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                    <a className="ph-btn ph-btn-ghost" href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.82rem" }}>
                      <ExternalLink size={14} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
                      Open in new tab
                    </a>
                    {looksLikePdfUrl(url) ? (
                      <span style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>PDF — use Open to view in the browser or download.</span>
                    ) : null}
                  </div>
                  {looksLikeImageUrl(url) ? (
                    <div style={{ marginTop: "0.65rem", borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", maxHeight: 280 }}>
                      <img src={url} alt={`Supporting document ${i + 1}`} style={{ width: "100%", height: "auto", display: "block", objectFit: "contain", maxHeight: 280, background: "#f4f4f4" }} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ padding: "0.85rem 1.15rem", borderTop: "1px solid var(--color-border)", display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="ph-btn ph-btn-ghost" onClick={() => downloadCredentials(app)}>
            <Download size={16} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
            Export summary (.txt)
          </button>
          <button type="button" className="ph-btn ph-btn-ghost" style={{ color: "#b42318" }} onClick={() => onReject(app)}>
            Reject…
          </button>
          <button type="button" className="ph-btn ph-btn-accent" onClick={() => onApprove(app.id)}>
            <Check size={16} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
            Approve
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function VetVerificationQueue() {
  const { user } = useAuth();
  const [pending, setPending] = useState<VetLicenseApplicationAdminDto[]>([]);
  const [metrics, setMetrics] = useState<VetApplicationMetricsDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<VetLicenseApplicationAdminDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailApp, setDetailApp] = useState<VetLicenseApplicationAdminDto | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [m, p] = await Promise.all([
        api<VetApplicationMetricsDto>("/api/admin/vet-applications/metrics"),
        api<VetLicenseApplicationAdminDto[]>("/api/admin/vet-applications/pending"),
      ]);
      setMetrics(m);
      setPending(p);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load queue");
    }
  }, []);

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
      setRejectFor(null);
      setRejectReason("");
      setDetailApp((cur) => (cur?.id === rejectFor.id ? null : cur));
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    }
  }

  function openReject(app: VetLicenseApplicationAdminDto) {
    setDetailApp(null);
    setRejectFor(app);
  }

  const total = metrics?.total ?? 0;
  const verifiedCount = metrics?.approved ?? 0;
  const pawvetBack = isAdminAccount(user) ? "/pawvet/admin" : "/pawvet";

  return (
    <div className="pawvet-shell">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.45rem", color: "var(--color-primary-dark)" }}>Vet verification</h1>
          <p style={{ margin: "0.35rem 0 0", color: "var(--color-muted)" }}>Review pending veterinarian license submissions.</p>
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

      <div className="pawvet-stat-bar" style={{ marginBottom: "1.25rem" }}>
        <motion.div className="pawvet-stat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
          <span>Total applications</span>
          <strong>{total}</strong>
        </motion.div>
        <motion.div className="pawvet-stat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <span>Verified</span>
          <strong>{verifiedCount}</strong>
        </motion.div>
        <motion.div className="pawvet-stat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <span>Pending</span>
          <strong>{pending.length}</strong>
        </motion.div>
      </div>

      <div className="pawvet-glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="pawvet-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>License</th>
                <th>University</th>
                <th>Documents</th>
                <th>Submitted</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "1.5rem", color: "var(--color-muted)", textAlign: "center" }}>
                      No pending applications.
                    </td>
                  </tr>
                ) : (
                  pending.map((app) => (
                    <motion.tr key={app.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td style={{ fontWeight: 600 }}>{app.displayName}</td>
                      <td>{app.licenseNumber}</td>
                      <td>{app.university}</td>
                      <td style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                        {(app.supportingDocumentUrls ?? []).length} file{(app.supportingDocumentUrls ?? []).length === 1 ? "" : "s"}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button type="button" className="ph-btn ph-btn-primary" style={{ fontSize: "0.82rem", padding: "0.25rem 0.55rem" }} onClick={() => setDetailApp(app)}>
                          <FileText size={14} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
                          View full application
                        </button>
                        <button type="button" className="ph-btn ph-btn-ghost" style={{ fontSize: "0.82rem", padding: "0.25rem 0.45rem", marginLeft: 4 }} onClick={() => downloadCredentials(app)}>
                          <Download size={14} aria-hidden />
                        </button>
                        <button type="button" className="ph-btn ph-btn-accent" style={{ fontSize: "0.82rem", marginLeft: 6 }} onClick={() => void approve(app.id)}>
                          <Check size={14} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
                          Approve
                        </button>
                        <button type="button" className="ph-btn ph-btn-ghost" style={{ fontSize: "0.82rem", marginLeft: 6, color: "#b42318" }} onClick={() => openReject(app)}>
                          <X size={14} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
                          Reject
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {detailApp ? (
        <FullApplicationDialog
          app={detailApp}
          onClose={() => setDetailApp(null)}
          onApprove={(id) => void approve(id)}
          onReject={(app) => openReject(app)}
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
              <button type="button" className="ph-btn ph-btn-primary" style={{ background: "#b42318", borderColor: "#b42318" }} onClick={() => void confirmReject()} disabled={!rejectReason.trim()}>
                Reject application
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
