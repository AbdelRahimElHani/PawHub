import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { VetApplicationMetricsDto, VetLicenseApplicationAdminDto } from "../types";
import "../pawvet/pawvet.css";

function downloadCredentials(app: VetLicenseApplicationAdminDto) {
  const docLines = (app.supportingDocumentUrls ?? []).map((u) => ` - ${u}`).join("\n");
  const text = `PawVet — License application\n\nName: ${app.displayName}\nEmail: ${app.email}\nUser ID: ${app.userId}\nLicense: ${app.licenseNumber}\nUniversity: ${app.university}\nYears experience: ${app.yearsExperience ?? "—"}\nPhone: ${app.phone ?? "—"}\nNotes:\n${app.professionalBio ?? "—"}\nSubmitted: ${app.createdAt}\n\nUploaded documents:\n${docLines || " (none listed)"}\n`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vet-application-${app.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function VetVerificationQueue() {
  const [pending, setPending] = useState<VetLicenseApplicationAdminDto[]>([]);
  const [metrics, setMetrics] = useState<VetApplicationMetricsDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<VetLicenseApplicationAdminDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    }
  }

  const total = metrics?.total ?? 0;
  const verifiedCount = metrics?.approved ?? 0;

  return (
    <div className="pawvet-shell">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.45rem", color: "var(--color-primary-dark)" }}>Vet verification</h1>
          <p style={{ margin: "0.35rem 0 0", color: "var(--color-muted)" }}>Review pending veterinarian license submissions.</p>
        </div>
        <Link className="ph-btn ph-btn-ghost" to="/pawvet">
          PawVet
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
                      <td style={{ fontSize: "0.8rem", maxWidth: 200 }}>
                        {(app.supportingDocumentUrls ?? []).length ? (
                          <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                            {(app.supportingDocumentUrls ?? []).slice(0, 3).map((url) => (
                              <li key={url} style={{ marginBottom: 2 }}>
                                <a href={url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: "break-all" }}>
                                  Open
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span style={{ color: "var(--color-muted)" }}>—</span>
                        )}
                        {(app.supportingDocumentUrls ?? []).length > 3 ? (
                          <span style={{ color: "var(--color-muted)" }}> +{(app.supportingDocumentUrls ?? []).length - 3} more</span>
                        ) : null}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button type="button" className="ph-btn ph-btn-ghost" style={{ fontSize: "0.82rem", padding: "0.25rem 0.5rem" }} onClick={() => downloadCredentials(app)}>
                          <Download size={14} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
                          Download
                        </button>
                        <button type="button" className="ph-btn ph-btn-accent" style={{ fontSize: "0.82rem", marginLeft: 6 }} onClick={() => void approve(app.id)}>
                          <Check size={14} style={{ marginRight: 4, verticalAlign: "middle" }} aria-hidden />
                          Approve
                        </button>
                        <button type="button" className="ph-btn ph-btn-ghost" style={{ fontSize: "0.82rem", marginLeft: 6, color: "#b42318" }} onClick={() => setRejectFor(app)}>
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
            zIndex: 60,
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
