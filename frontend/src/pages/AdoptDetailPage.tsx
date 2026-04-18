import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { AdoptionListingDto } from "../types";

export function AdoptDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [listing, setListing] = useState<AdoptionListingDto | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api<AdoptionListingDto>(`/api/adopt/listings/${id}`)
      .then(setListing)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [id]);

  async function inquire() {
    if (!id) return;
    setErr(null);
    try {
      const r = await api<{ threadId: number }>(`/api/adopt/listings/${id}/inquire`, { method: "POST" });
      nav(`/chat/${r.threadId}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }

  if (!listing) return <p>{err ?? "Loading…"}</p>;

  return (
    <div className="ph-surface" style={{ padding: "1.25rem", maxWidth: 640, margin: "0 auto" }}>
      {listing.photoUrl && <img src={listing.photoUrl} alt="" style={{ width: "100%", borderRadius: 16 }} />}
      <h2>{listing.title}</h2>
      <p style={{ color: "var(--color-muted)" }}>
        {listing.petName} · {listing.shelterName}
      </p>
      <p>{listing.description}</p>
      {err && <p style={{ color: "#b42318" }}>{err}</p>}
      <button type="button" className="ph-btn ph-btn-primary" onClick={() => void inquire()}>
        Send adoption inquiry
      </button>
    </div>
  );
}
