import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ShelterDto } from "../types";

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
    await api(`/api/admin/shelters/${id}/approve`, { method: "POST" });
    await load();
  }

  async function reject(id: number) {
    await api(`/api/admin/shelters/${id}/reject`, { method: "POST" });
    await load();
  }

  return (
    <div className="ph-surface" style={{ padding: "1.25rem" }}>
      <h2 style={{ marginTop: 0 }}>Pending shelters</h2>
      {err && <p style={{ color: "#b42318" }}>{err}</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {rows.map((s) => (
          <li key={s.id} className="ph-surface" style={{ padding: "0.9rem", marginBottom: "0.6rem" }}>
            <strong>{s.name}</strong> · owner user #{s.ownerUserId}
            <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
              {s.city} / {s.region}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="button" className="ph-btn ph-btn-primary" onClick={() => void approve(s.id)}>
                Approve
              </button>
              <button type="button" className="ph-btn ph-btn-ghost" onClick={() => void reject(s.id)}>
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
