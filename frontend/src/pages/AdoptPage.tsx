import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AdoptionListingDto, ShelterDto } from "../types";

export function AdoptPage() {
  const [rows, setRows] = useState<AdoptionListingDto[]>([]);
  const [shelter, setShelter] = useState<ShelterDto | null>(null);

  useEffect(() => {
    void api<AdoptionListingDto[]>("/api/adopt/listings")
      .then(setRows)
      .catch(() => setRows([]));
    void api<ShelterDto | null>("/api/adopt/shelters/mine")
      .then((s) => setShelter(s))
      .catch(() => setShelter(null));
  }, []);

  return (
    <div className="ph-surface" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>PawAdopt</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link className="ph-btn ph-btn-ghost" to="/adopt/shelter">
            Shelter profile
          </Link>
          {shelter?.status === "APPROVED" && (
            <Link className="ph-btn ph-btn-accent" to="/adopt/new">
              New adoption listing
            </Link>
          )}
        </div>
      </div>
      {shelter && (
        <p style={{ color: "var(--color-muted)" }}>
          Your shelter: <strong>{shelter.name}</strong> ({shelter.status})
        </p>
      )}
      <div className="ph-grid ph-grid-2" style={{ marginTop: "1rem" }}>
        {rows.map((l) => (
          <div key={l.id} className="ph-surface" style={{ padding: "1rem" }}>
            {l.photoUrl && <img src={l.photoUrl} alt="" style={{ width: "100%", borderRadius: 14 }} />}
            <strong>{l.title}</strong>
            <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
              {l.petName ?? "Unnamed"} · {l.shelterName}
            </div>
            <Link className="ph-btn ph-btn-primary" style={{ marginTop: "0.5rem", display: "inline-block" }} to={`/adopt/${l.id}`}>
              View
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
