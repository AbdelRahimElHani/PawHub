import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { MarketListingDto } from "../types";

export function MarketPage() {
  const [rows, setRows] = useState<MarketListingDto[]>([]);
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");

  async function load() {
    const q = new URLSearchParams();
    if (city) q.set("city", city);
    if (region) q.set("region", region);
    const qs = q.toString();
    setRows(await api<MarketListingDto[]>(`/api/market/listings${qs ? `?${qs}` : ""}`));
  }

  useEffect(() => {
    void load().catch(() => setRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  return (
    <div className="ph-surface" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>PawMarket</h2>
        <Link className="ph-btn ph-btn-accent" to="/market/new">
          New listing
        </Link>
      </div>
      <form onSubmit={onSearch} style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <input className="ph-input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ maxWidth: 200 }} />
        <input className="ph-input" placeholder="Region" value={region} onChange={(e) => setRegion(e.target.value)} style={{ maxWidth: 200 }} />
        <button className="ph-btn ph-btn-primary" type="submit">
          Search
        </button>
      </form>
      <div className="ph-grid ph-grid-2" style={{ marginTop: "1rem" }}>
        {rows.map((l) => (
          <Link key={l.id} to={`/market/${l.id}`} className="ph-surface" style={{ padding: "1rem", display: "block" }}>
            {l.photoUrl && <img src={l.photoUrl} alt="" style={{ width: "100%", borderRadius: 14, marginBottom: "0.5rem" }} />}
            <strong>{l.title}</strong>
            <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
              {(l.priceCents / 100).toFixed(2)} · {l.city ?? "?"} / {l.region ?? "?"}
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Seller: {l.sellerDisplayName}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
