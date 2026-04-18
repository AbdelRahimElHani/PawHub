import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import type { CatDto } from "../types";

export function CatsPage() {
  const [cats, setCats] = useState<CatDto[]>([]);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState<string>("");
  const [bio, setBio] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      setCats(await api<CatDto[]>("/api/cats"));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api("/api/cats", {
        method: "POST",
        body: JSON.stringify({
          name,
          breed: breed || null,
          ageMonths: age ? Number(age) : null,
          bio: bio || null,
        }),
      });
      setName("");
      setBreed("");
      setAge("");
      setBio("");
      await load();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Create failed");
    }
  }

  return (
    <div className="ph-grid ph-grid-2">
      <div className="ph-surface" style={{ padding: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Your cats</h2>
        {err && <p style={{ color: "#b42318" }}>{err}</p>}
        <ul style={{ paddingLeft: "1.1rem" }}>
          {cats.map((c) => (
            <li key={c.id} style={{ marginBottom: "0.75rem" }}>
              <strong>{c.name}</strong>
              {c.breed ? ` · ${c.breed}` : ""}
              {c.ageMonths != null ? ` · ${c.ageMonths} mo` : ""}
              {c.photoUrls?.length ? (
                <div style={{ marginTop: "0.35rem" }}>
                  <img src={c.photoUrls[0]} alt="" style={{ maxWidth: 160, borderRadius: 12 }} />
                </div>
              ) : null}
              <div style={{ marginTop: "0.35rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                  Add photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const fd = new FormData();
                      fd.append("file", f);
                      void api(`/api/cats/${c.id}/photos`, { method: "POST", body: fd }).then(load);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="ph-surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Add a cat</h3>
        <form onSubmit={onCreate} className="ph-grid">
          <label>
            Name
            <input className="ph-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Breed
            <input className="ph-input" value={breed} onChange={(e) => setBreed(e.target.value)} />
          </label>
          <label>
            Age (months)
            <input className="ph-input" value={age} onChange={(e) => setAge(e.target.value)} type="number" />
          </label>
          <label>
            Bio
            <textarea className="ph-textarea" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <button className="ph-btn ph-btn-primary" type="submit">
            Save cat
          </button>
        </form>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>After saving, add a photo from the API or extend this UI with uploads.</p>
      </div>
    </div>
  );
}
