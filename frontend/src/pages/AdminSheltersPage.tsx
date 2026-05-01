import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, FileSearch, Shield } from "lucide-react";
import { api } from "../api/client";
import type { ShelterDto } from "../types";
import "../adopt/adopt.css";

type Tab = "pending" | "appeals" | "approved" | "rejected";

export function AdminSheltersPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<ShelterDto[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      if (tab === "pending") {
        setRows(await api<ShelterDto[]>("/api/admin/shelters/pending"));
      } else if (tab === "appeals") {
        setRows(await api<ShelterDto[]>("/api/admin/shelters/appeals-pending"));
      } else if (tab === "approved") {
        setRows(await api<ShelterDto[]>("/api/admin/shelters/by-status?status=APPROVED"));
      } else {
        setRows(await api<ShelterDto[]>("/api/admin/shelters/by-status?status=REJECTED"));
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
      setRows([]);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="ph-surface" style={{ padding: "clamp(1.25rem, 3vw, 2rem)", maxWidth: 720, margin: "0 auto" }}>
      <p style={{ marginBottom: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <Link to="/adopt" style={{ fontWeight: 600 }}>
          ← PawAdopt home
        </Link>
        <Link className="ph-btn ph-btn-ghost" to="/adopt/admin/vet-verification" style={{ fontWeight: 600 }}>
          PawVet — vet verification queue
        </Link>
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
        <Shield size={26} strokeWidth={1.75} aria-hidden style={{ color: "var(--color-primary-dark)" }} />
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 1.85rem)" }}>
          Shelter administration
        </h1>
      </div>
      <p style={{ color: "var(--color-muted)", lineHeight: 1.65, margin: "0 0 1rem" }}>
        Review new dossiers, appeals after a rejection, or browse approved and declined shelters. Use{" "}
        <em>Review application</em> for the full file and adoption listings tied to a shelter.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "1.25rem" }}>
        {(
          [
            ["pending", "Pending queue"],
            ["appeals", "Appeals"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className="ph-btn ph-btn-ghost"
            style={{ fontWeight: tab === k ? 700 : 500 }}
            data-active={tab === k}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {err && (
        <p style={{ color: "#b42318", marginBottom: "1rem" }} role="alert">
          {err}
        </p>
      )}

      {rows.length === 0 && !err && (
        <div className="adopt-gate" style={{ textAlign: "center" }}>
          <BadgeCheck size={32} strokeWidth={1.75} aria-hidden style={{ color: "#2d6a4f", marginBottom: "0.5rem" }} />
          <h2 style={{ margin: "0 0 0.35rem" }}>Nothing here</h2>
          <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.55 }}>
            {tab === "pending" && "No pending submissions in this view."}
            {tab === "appeals" && "No shelter appeals awaiting a decision."}
            {tab === "approved" && "No approved shelter rows returned."}
            {tab === "rejected" && "No rejected shelter rows returned."}
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
              Status: <strong>{s.status}</strong>
              {s.appealState ? (
                <>
                  <br />
                  Appeal: <strong>{s.appealState}</strong>
                  {s.appealSubmittedAt ? (
                    <>
                      <br />
                      Submitted: {new Date(s.appealSubmittedAt).toLocaleString()}
                    </>
                  ) : null}
                </>
              ) : null}
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
                to={`/adopt/admin/shelters/${s.id}`}
                className="ph-btn ph-btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <FileSearch size={16} aria-hidden />
                Review application
              </Link>
              {tab === "pending" && s.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    className="ph-btn ph-btn-ghost"
                    onClick={() => {
                      if (!window.confirm("Approve this shelter without opening the full dossier?")) return;
                      void (async () => {
                        await api(`/api/admin/shelters/${s.id}/approve`, { method: "POST" });
                        await load();
                      })();
                    }}
                  >
                    Quick approve
                  </button>
                  <button
                    type="button"
                    className="ph-btn ph-btn-ghost"
                    onClick={() => {
                      if (!window.confirm("Decline this shelter application?")) return;
                      const reason = window.prompt("Optional note to the shelter (or leave blank):") ?? "";
                      void (async () => {
                        await api(`/api/admin/shelters/${s.id}/reject`, {
                          method: "POST",
                          body: reason.trim() ? JSON.stringify({ reason: reason.trim() }) : undefined,
                        });
                        await load();
                      })();
                    }}
                  >
                    Quick decline
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
