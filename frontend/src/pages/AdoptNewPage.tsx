import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export function AdoptNewPage() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [petName, setPetName] = useState("");
  const [description, setDescription] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const created = await api<{ id: number }>("/api/adopt/listings", {
        method: "POST",
        body: JSON.stringify({
          title,
          petName: petName || null,
          description: description || null,
          breed: breed || null,
          ageMonths: age ? Number(age) : null,
        }),
      });
      nav(`/adopt/${created.id}`);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Failed");
    }
  }

  return (
    <div className="ph-surface" style={{ maxWidth: 520, margin: "0 auto", padding: "1.25rem" }}>
      <h2 style={{ marginTop: 0 }}>New adoption listing</h2>
      <form onSubmit={onSubmit} className="ph-grid">
        <label>
          Title
          <input className="ph-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Pet name
          <input className="ph-input" value={petName} onChange={(e) => setPetName(e.target.value)} />
        </label>
        <label>
          Description
          <textarea className="ph-textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          Breed
          <input className="ph-input" value={breed} onChange={(e) => setBreed(e.target.value)} />
        </label>
        <label>
          Age (months)
          <input className="ph-input" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
        </label>
        {err && <div style={{ color: "#b42318" }}>{err}</div>}
        <button className="ph-btn ph-btn-primary" type="submit">
          Publish
        </button>
      </form>
    </div>
  );
}
