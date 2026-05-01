import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { PawvetVetReportAdminDto } from "../types";
import "../pawvet/pawvet.css";

export function AdminPawvetVetReportsPage() {
  const [rows, setRows] = useState<PawvetVetReportAdminDto[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    api<PawvetVetReportAdminDto[]>("/api/admin/pawvet/vet-reports")
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load reports.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pawvet-shell">
      <h1 style={{ fontSize: "1.45rem", color: "var(--color-primary-dark)", margin: "0 0 0.5rem" }}>PawVet veterinarian reports</h1>
      <p style={{ margin: "0 0 1rem", color: "var(--color-muted)", maxWidth: "62ch", lineHeight: 1.55 }}>
        Reports submitted by guardians about veterinarians during or after triage cases.
      </p>
      <p style={{ marginBottom: "1rem" }}>
        <Link className="ph-btn ph-btn-ghost" to="/adopt/admin/vet-verification">
          ← Vet verification
        </Link>
      </p>
      {err ? (
        <p className="pawvet-glass-card" style={{ padding: "1rem", border: "1px solid #fecaca", background: "#fef2f2", color: "#b42318" }}>
          {err}
        </p>
      ) : null}
      {rows === null && !err ? <p style={{ color: "var(--color-muted)" }}>Loading…</p> : null}
      {rows && rows.length === 0 ? (
        <p className="pawvet-glass-card" style={{ padding: "1rem", color: "var(--color-muted)" }}>
          No reports yet.
        </p>
      ) : null}
      {rows && rows.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {rows.map((r) => (
            <div key={r.id} className="pawvet-glass-card" style={{ padding: "1rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase" }}>
                Case #{r.triageCaseId} · {r.catName}
              </div>
              <div style={{ marginTop: "0.35rem", fontSize: "0.9rem", color: "var(--color-primary-dark)" }}>
                Reported vet: <Link to={`/users/${r.vetUserId}`}>{r.vetDisplayName}</Link> ({r.vetEmail})
              </div>
              <div style={{ marginTop: "0.35rem", fontSize: "0.88rem", color: "var(--color-muted)" }}>
                Reporter: <Link to={`/users/${r.reporterUserId}`}>{r.reporterDisplayName}</Link> ({r.reporterEmail})
              </div>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.92rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{r.reason}</p>
              <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--color-muted)" }}>{new Date(r.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
