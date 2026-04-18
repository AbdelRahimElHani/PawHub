import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { MarketListingDto } from "../types";

export function MarketDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [listing, setListing] = useState<MarketListingDto | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api<MarketListingDto>(`/api/market/listings/${id}`)
      .then(setListing)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [id]);

  async function contactSeller() {
    if (!id) return;
    setErr(null);
    try {
      const r = await api<{ threadId: number }>(`/api/market/listings/${id}/thread`, { method: "POST" });
      nav(`/chat/${r.threadId}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }

  if (!listing) return <p>{err ?? "Loading…"}</p>;

  return (
    <div className="ph-surface" style={{ padding: "1.25rem", maxWidth: 640, margin: "0 auto" }}>
      {listing.photoUrl && <img src={listing.photoUrl} alt="" style={{ width: "100%", borderRadius: 16 }} />}
      <h2 style={{ marginBottom: "0.25rem" }}>{listing.title}</h2>
      <div style={{ color: "var(--color-muted)" }}>
        {(listing.priceCents / 100).toFixed(2)} · {listing.city} / {listing.region}
      </div>
      <p>{listing.description}</p>
      <div style={{ fontSize: "0.9rem", color: "var(--color-muted)" }}>Seller: {listing.sellerDisplayName}</div>
      {err && <p style={{ color: "#b42318" }}>{err}</p>}
      <button type="button" className="ph-btn ph-btn-primary" style={{ marginTop: "1rem" }} onClick={() => void contactSeller()}>
        Message seller
      </button>
    </div>
  );
}
