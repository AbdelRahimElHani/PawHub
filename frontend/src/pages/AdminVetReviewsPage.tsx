import { ChevronDown, ChevronRight, MessageCircle, Star, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { VetAccountReviewsAdminDto } from "../types/pawvetConsultationReview";
import "../pawvet/pawvet.css";

function vetVerificationLabel(status: string, revokedByAdmin: boolean | undefined): string {
  if (revokedByAdmin) return "Revoked";
  if (status === "PENDING") return "Pending";
  if (status === "APPROVED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return status;
}

function vetVerificationBadgeStyle(status: string, revokedByAdmin: boolean | undefined): { bg: string; color: string } {
  if (revokedByAdmin || status === "REJECTED") {
    return { bg: "rgba(180, 35, 24, 0.12)", color: "#b42318" };
  }
  if (status === "APPROVED") return { bg: "rgba(22, 163, 74, 0.14)", color: "#15803d" };
  return { bg: "rgba(217, 119, 6, 0.14)", color: "#b45309" };
}

export function AdminVetReviewsPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<VetAccountReviewsAdminDto[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [revokingId, setRevokingId] = useState<number | null>(null);

  async function load() {
    setErr(null);
    try {
      const data = await api<VetAccountReviewsAdminDto[]>("/api/admin/pawvet/vet-accounts-with-reviews");
      setRows(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not load data.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function toggle(id: number) {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
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

  async function revokeVet(vetUserId: number) {
    if (!window.confirm("Revoke this veterinarian’s verification? Their account becomes a standard user until they re-apply.")) return;
    setErr(null);
    setRevokingId(vetUserId);
    try {
      await api(`/api/admin/vet-accounts/${vetUserId}/revoke-credentials`, { method: "POST" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="pawvet-shell">
      <div className="pawvet-hero" style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.45rem", color: "var(--color-primary-dark)" }}>Veterinarian reviews and comments</h1>
        <p style={{ margin: 0, color: "var(--color-muted)", maxWidth: "62ch", lineHeight: 1.55 }}>
          Every account registered as a veterinarian is listed below. Expand a row to read star ratings and written
          comments guardians left after closed consultations. You can revoke verification from here.
        </p>
      </div>

      <p style={{ marginBottom: "1rem" }}>
        <Link className="ph-btn ph-btn-ghost" to="/pawvet">
          ← PawVet
        </Link>
      </p>

      {err && (
        <p className="pawvet-glass-card" style={{ padding: "1rem", border: "1px solid #fecaca", background: "#fef2f2", color: "#b42318" }}>
          {err}
        </p>
      )}

      {rows === null && !err ? <p style={{ color: "var(--color-muted)" }}>Loading…</p> : null}

      {rows && rows.length === 0 ? (
        <p className="pawvet-glass-card" style={{ padding: "1rem", color: "var(--color-muted)", margin: 0 }}>
          No veterinarian accounts yet.
        </p>
      ) : null}

      {rows && rows.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {rows.map((v) => {
            const expanded = !!open[v.vetUserId];
            const revoked = Boolean(v.verificationRevokedByAdmin);
            const statusLabel = vetVerificationLabel(v.vetVerificationStatus, v.verificationRevokedByAdmin);
            const badge = vetVerificationBadgeStyle(v.vetVerificationStatus, v.verificationRevokedByAdmin);
            const canRevoke = v.vetVerificationStatus === "APPROVED";
            return (
              <div key={v.vetUserId} className="pawvet-glass-card" style={{ padding: 0, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => toggle(v.vetUserId)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "1rem",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {expanded ? <ChevronDown size={20} aria-hidden /> : <ChevronRight size={20} aria-hidden />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--color-primary-dark)" }}>{v.displayName}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>{v.email}</div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      padding: "0.22rem 0.55rem",
                      borderRadius: 999,
                      background: badge.bg,
                      color: badge.color,
                      whiteSpace: "nowrap",
                    }}
                    title={revoked ? "Verification was revoked from this admin page" : undefined}
                  >
                    {statusLabel}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#f59e0b", fontWeight: 700 }}>
                    <Star size={16} fill="currentColor" aria-hidden />
                    {v.reviewCount ? v.averageStars.toFixed(1) : "—"}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>({v.reviewCount})</span>
                </button>
                {expanded ? (
                  <div style={{ borderTop: "1px solid var(--color-border)", padding: "1rem", background: "rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
                      <Link className="ph-btn ph-btn-ghost" style={{ fontSize: "0.85rem" }} to={`/users/${v.vetUserId}`}>
                        Profile
                      </Link>
                      <button type="button" className="ph-btn ph-btn-ghost" style={{ fontSize: "0.85rem" }} onClick={() => void openDm(v.vetUserId)}>
                        <MessageCircle size={16} style={{ marginRight: 6, verticalAlign: "middle" }} aria-hidden />
                        Message
                      </button>
                      <button
                        type="button"
                        className="ph-btn ph-btn-primary"
                        style={{ fontSize: "0.85rem", background: "#b42318", borderColor: "#b42318" }}
                        disabled={revokingId === v.vetUserId || !canRevoke}
                        title={!canRevoke ? "Only verified veterinarians can be revoked here." : undefined}
                        onClick={() => void revokeVet(v.vetUserId)}
                      >
                        <UserX size={16} style={{ marginRight: 6, verticalAlign: "middle" }} aria-hidden />
                        {revokingId === v.vetUserId ? "Revoking…" : revoked ? "Already revoked" : "Revoke verification"}
                      </button>
                    </div>
                    {v.reviews.length === 0 ? (
                      <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "0.9rem" }}>No reviews yet.</p>
                    ) : (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                        {v.reviews.map((r) => (
                          <li key={r.id} className="ph-surface" style={{ padding: "0.75rem 0.9rem" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", alignItems: "baseline" }}>
                              <strong style={{ color: "var(--color-primary-dark)" }}>{r.stars}★</strong>
                              <span style={{ fontSize: "0.88rem", color: "var(--color-muted)" }}>by {r.ownerDisplayName}</span>
                              <span style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
                                {new Date(r.createdAt).toLocaleString()}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>Case {r.externalCaseId}</span>
                            </div>
                            {r.comment ? (
                              <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", lineHeight: 1.5, color: "var(--color-primary-dark)" }}>{r.comment}</p>
                            ) : (
                              <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--color-muted)", fontStyle: "italic" }}>
                                No written comment.
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
