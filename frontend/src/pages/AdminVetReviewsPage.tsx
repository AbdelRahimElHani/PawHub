import { ChevronDown, ChevronRight, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { VetAccountReviewsAdminDto } from "../types/pawvetConsultationReview";
import "../pawvet/pawvet.css";

export function AdminVetReviewsPage() {
  const [rows, setRows] = useState<VetAccountReviewsAdminDto[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    api<VetAccountReviewsAdminDto[]>("/api/admin/pawvet/vet-accounts-with-reviews")
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load data.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: number) {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  }

  return (
    <div className="pawvet-shell">
      <div className="pawvet-hero" style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.45rem", color: "var(--color-primary-dark)" }}>Veterinarian reviews and comments</h1>
        <p style={{ margin: 0, color: "var(--color-muted)", maxWidth: "62ch", lineHeight: 1.55 }}>
          Every account registered as a veterinarian is listed below. Expand a row to read star ratings and written
          comments guardians left after closed consultations.
        </p>
      </div>

      <p style={{ marginBottom: "1rem" }}>
        <Link className="ph-btn ph-btn-ghost" to="/pawvet/admin">
          ← PawVet admin
        </Link>
      </p>

      {err && (
        <p className="pawvet-glass-card" style={{ padding: "1rem", border: "1px solid #fecaca", background: "#fef2f2", color: "#b42318" }}>
          {err}
        </p>
      )}

      {rows === null && !err ? <p style={{ color: "var(--color-muted)" }}>Loading…</p> : null}

      {rows && rows.length === 0 ? (
        <p className="pawvet-glass-card" style={{ padding: "1rem", color: "var(--color-muted)", margin: 0 }}>No veterinarian accounts yet.</p>
      ) : null}

      {rows && rows.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {rows.map((v) => {
            const expanded = !!open[v.vetUserId];
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
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)" }}>
                    {v.vetVerificationStatus}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#f59e0b", fontWeight: 700 }}>
                    <Star size={16} fill="currentColor" aria-hidden />
                    {v.reviewCount ? v.averageStars.toFixed(1) : "—"}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>({v.reviewCount})</span>
                </button>
                {expanded ? (
                  <div style={{ borderTop: "1px solid var(--color-border)", padding: "1rem", background: "rgba(0,0,0,0.02)" }}>
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
                              <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--color-muted)", fontStyle: "italic" }}>No written comment.</p>
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
