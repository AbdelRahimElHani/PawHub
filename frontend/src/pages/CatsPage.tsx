import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import type { CatDto } from "../types";

const GENDER_LABEL: Record<string, string> = { MALE: "♂ Male", FEMALE: "♀ Female" };

export function CatsPage() {
  const [cats, setCats] = useState<CatDto[]>([]);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "">("");
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
          gender: gender || null,
          bio: bio || null,
        }),
      });
      setName("");
      setBreed("");
      setAge("");
      setGender("");
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
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {cats.map((c) => (
            <li key={c.id} style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              {c.photoUrls?.length ? (
                <img src={c.photoUrls[0]} alt={c.name} style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 72, height: 72, borderRadius: 12, flexShrink: 0,
                  background: "var(--color-bg)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "1.75rem",
                }}>🐱</div>
              )}
              <div>
                <strong>{c.name}</strong>
                {c.gender && <span style={{ marginLeft: "0.4rem", fontSize: "0.8rem", color: "var(--color-muted)" }}>{GENDER_LABEL[c.gender]}</span>}
                {c.breed ? <span style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}> · {c.breed}</span> : null}
                {c.ageMonths != null ? <span style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}> · {c.ageMonths} mo</span> : null}
                <div style={{ marginTop: "0.35rem" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--color-muted)", cursor: "pointer" }}>
                    Add photo&nbsp;
                    <input
                      type="file"
                      accept="image/*"
                      style={{ fontSize: "0.8rem" }}
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
              </div>
            </li>
          ))}
          {cats.length === 0 && !err && (
            <p style={{ color: "var(--color-muted)" }}>No cats yet — add one on the right.</p>
          )}
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
            <input className="ph-input" value={age} onChange={(e) => setAge(e.target.value)} type="number" min="0" />
          </label>
          <label>
            Gender
            <select className="ph-select" value={gender} onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "")}>
              <option value="">Not specified</option>
              <option value="MALE">♂ Male</option>
              <option value="FEMALE">♀ Female</option>
            </select>
          </label>
          <label>
            Bio
            <textarea className="ph-textarea" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          {err && <div style={{ color: "#b42318" }}>{err}</div>}
          <button className="ph-btn ph-btn-primary" type="submit">
            Save cat
          </button>
        </form>
      </div>
    </div>
  );
}
