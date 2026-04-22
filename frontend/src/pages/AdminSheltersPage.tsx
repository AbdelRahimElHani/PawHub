import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, FileSearch, Shield } from "lucide-react";
import { api } from "../api/client";
import type { ShelterDto } from "../types";
import "../adopt/adopt.css";

export function AdminSheltersPage() {
  const [rows, setRows] = useState<ShelterDto[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      setRows(await api<ShelterDto[]>("/api/admin/shelters/pending"));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function approve(id: number) {
    if (!window.confirm("Approve this shelter without opening the full dossier?")) return;
    await api(`/api/admin/shelters/${id}/approve`, { method: "POST" });
    await load();
  }

  async function reject(id: number) {
    if (!window.confirm("Decline this shelter application?")) return;
    await api(`/api/admin/shelters/${id}/reject`, { method: "POST" });
    await load();
  }

  return (
    <div className="ph-surface" style={{ padding: "clamp(1.25rem, 3vw, 2rem)", maxWidth: 720, margin: "0 auto" }}>
      <p style={{ marginBottom: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <Link to="/" style={{ fontWeight: 600 }}>
          ← Back to app
        </Link>
        <Link to="/admin/vet-verification" style={{ fontWeight: 600 }}>
          PawVet — vet verification queue
        </Link>
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
        <Shield size={26} strokeWidth={1.75} aria-hidden style={{ color: "var(--color-primary-dark)" }} />
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 1.85rem)" }}>
          Shelter submissions
        </h1>
      </div>
      <p style={{ color: "var(--color-muted)", lineHeight: 1.65, margin: "0 0 1.75rem" }}>
        Submitted dossiers appear first (oldest first). Some rows may be <strong>legacy pending</strong> without a
        dossier timestamp—still review before approving. Use <em>Review application</em> for the full file.
      </p>

      {err && (
        <p style={{ color: "#b42318", marginBottom: "1rem" }} role="alert">
          {err}
        </p>
      )}

      {rows.length === 0 && !err && (
        <div className="adopt-gate" style={{ textAlign: "center" }}>
          <BadgeCheck size={32} strokeWidth={1.75} aria-hidden style={{ color: "#2d6a4f", marginBottom: "0.5rem" }} />
          <h2 style={{ margin: "0 0 0.35rem" }}>No submissions in queue</h2>
          <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.55 }}>
            When new shelters submit a complete dossier, they will show up here. If you use seed data, pending shelters
            without a dossier timestamp may still appear for approval.
          </p>
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rows.map((s) => (
          <li key={s.id} className="admin-shelter-card">
            <h3 style={{ marginTop: 0 }}>{s.name}</h3>
            <div className="admin-shelter-meta">
              Owner user #{s.ownerUserId}
              <br />
              {[s.city, s.region].filter(Boolean).join(", ") || "Location not set"}
              <br />
              {s.profileCompletedAt ? (
                <span style={{ color: "#1b4332", fontWeight: 600 }}>
                  Dossier submitted {new Date(s.profileCompletedAt).toLocaleString()}
                </span>
              ) : (
                <span style={{ color: "#a67c00", fontWeight: 600 }}>No dossier timestamp — review carefully</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
              <Link
                to={`/admin/shelters/${s.id}`}
                className="ph-btn ph-btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <FileSearch size={16} aria-hidden />
                Review application
              </Link>
              <button type="button" className="ph-btn ph-btn-ghost" onClick={() => void approve(s.id)}>
                Quick approve
              </button>
              <button type="button" className="ph-btn ph-btn-ghost" onClick={() => void reject(s.id)}>
                Quick decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
