import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export function MarketNewPage() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const created = await api<{ id: number; title: string }>("/api/market/listings", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description || null,
          priceCents: Math.round(Number(price) * 100),
          city: city || null,
          region: region || null,
          catId: null,
        }),
      });
      nav(`/market/${created.id}`);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Failed");
    }
  }

  return (
    <div className="ph-surface" style={{ maxWidth: 520, margin: "0 auto", padding: "1.25rem" }}>
      <h2 style={{ marginTop: 0 }}>New listing</h2>
      <form onSubmit={onSubmit} className="ph-grid">
        <label>
          Title
          <input className="ph-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Description
          <textarea className="ph-textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          Price (USD)
          <input className="ph-input" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </label>
        <label>
          City
          <input className="ph-input" value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label>
          Region
          <input className="ph-input" value={region} onChange={(e) => setRegion(e.target.value)} />
        </label>
        {err && <div style={{ color: "#b42318" }}>{err}</div>}
        <button className="ph-btn ph-btn-primary" type="submit">
          Publish
        </button>
      </form>
    </div>
  );
}
