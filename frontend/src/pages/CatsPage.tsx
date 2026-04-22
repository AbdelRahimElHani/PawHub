import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import type { CatBehavior, CatDto, MatchBehaviorPreference, MatchGenderPreference } from "../types";
import { CAT_BEHAVIORS } from "../types";

const GENDER_LABEL: Record<string, string> = { MALE: "♂ Male", FEMALE: "♀ Female" };

const PREF_LOOKING_LABEL: Record<MatchGenderPreference, string> = {
  ANY: "Any gender",
  MALE: "♂ Male cats only",
  FEMALE: "♀ Female cats only",
};

const BEHAVIOR_LABEL: Record<CatBehavior, string> = {
  PLAYFUL: "Playful / energetic",
  CALM: "Calm / easygoing",
  CUDDLY: "Cuddly / affectionate",
  INDEPENDENT: "Independent",
  CURIOUS: "Curious / explorer",
  CHILL: "Chill / laid-back",
};

const PREF_BEHAVIOR_OPTIONS: MatchBehaviorPreference[] = ["ANY", ...CAT_BEHAVIORS];

const PREF_BEHAVIOR_LABEL: Record<MatchBehaviorPreference, string> = {
  ANY: "Any personality",
  PLAYFUL: BEHAVIOR_LABEL.PLAYFUL,
  CALM: BEHAVIOR_LABEL.CALM,
  CUDDLY: BEHAVIOR_LABEL.CUDDLY,
  INDEPENDENT: BEHAVIOR_LABEL.INDEPENDENT,
  CURIOUS: BEHAVIOR_LABEL.CURIOUS,
  CHILL: BEHAVIOR_LABEL.CHILL,
};

function catPayloadBase(cat: CatDto) {
  return {
    name: cat.name,
    breed: cat.breed,
    ageMonths: cat.ageMonths,
    gender: cat.gender,
    bio: cat.bio,
    prefLookingForGender: cat.prefLookingForGender ?? "ANY",
    prefMinAgeMonths: cat.prefMinAgeMonths,
    prefMaxAgeMonths: cat.prefMaxAgeMonths,
    behavior: cat.behavior,
    prefBehavior: cat.prefBehavior ?? "ANY",
    prefBreed: cat.prefBreed,
  };
}

function CatPawMatchPrefsForm({ cat, onSaved }: { cat: CatDto; onSaved: () => void }) {
  const [behavior, setBehavior] = useState<CatBehavior | "">(cat.behavior ?? "");
  const [prefGender, setPrefGender] = useState<MatchGenderPreference>(cat.prefLookingForGender ?? "ANY");
  const [minAge, setMinAge] = useState(cat.prefMinAgeMonths?.toString() ?? "");
  const [maxAge, setMaxAge] = useState(cat.prefMaxAgeMonths?.toString() ?? "");
  const [prefBehavior, setPrefBehavior] = useState<MatchBehaviorPreference>(cat.prefBehavior ?? "ANY");
  const [prefBreed, setPrefBreed] = useState(cat.prefBreed ?? "");
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    setBehavior(cat.behavior ?? "");
    setPrefGender(cat.prefLookingForGender ?? "ANY");
    setMinAge(cat.prefMinAgeMonths?.toString() ?? "");
    setMaxAge(cat.prefMaxAgeMonths?.toString() ?? "");
    setPrefBehavior(cat.prefBehavior ?? "ANY");
    setPrefBreed(cat.prefBreed ?? "");
  }, [
    cat.id,
    cat.behavior,
    cat.prefLookingForGender,
    cat.prefMinAgeMonths,
    cat.prefMaxAgeMonths,
    cat.prefBehavior,
    cat.prefBreed,
  ]);

  async function onSavePrefs(e: FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    setSaving(true);
    try {
      await api(`/api/cats/${cat.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...catPayloadBase(cat),
          behavior: behavior === "" ? null : behavior,
          prefLookingForGender: prefGender,
          prefMinAgeMonths: minAge === "" ? null : Number(minAge),
          prefMaxAgeMonths: maxAge === "" ? null : Number(maxAge),
          prefBehavior,
          prefBreed: prefBreed.trim() === "" ? null : prefBreed.trim(),
        }),
      });
      await onSaved();
    } catch (ex: unknown) {
      setLocalErr(ex instanceof Error ? ex.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSavePrefs}
      className="ph-grid"
      style={{ marginTop: "0.65rem", paddingTop: "0.65rem", borderTop: "1px solid var(--color-border, #e8e8e8)" }}
    >
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-muted)", gridColumn: "1 / -1" }}>
        PawMatch — profile &amp; filters
      </div>
      <label style={{ gridColumn: "1 / -1" }}>
        This cat is usually…
        <select className="ph-select" value={behavior} onChange={(e) => setBehavior(e.target.value as CatBehavior | "")}>
          <option value="">Not set (set for better matches)</option>
          {(Object.keys(BEHAVIOR_LABEL) as CatBehavior[]).map((k) => (
            <option key={k} value={k}>
              {BEHAVIOR_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        Show me (gender)
        <select className="ph-select" value={prefGender} onChange={(e) => setPrefGender(e.target.value as MatchGenderPreference)}>
          {(Object.keys(PREF_LOOKING_LABEL) as MatchGenderPreference[]).map((k) => (
            <option key={k} value={k}>
              {PREF_LOOKING_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Their min age (mo.)
        <input className="ph-input" type="number" min={0} max={600} placeholder="0" value={minAge} onChange={(e) => setMinAge(e.target.value)} />
      </label>
      <label>
        Their max age (mo.)
        <input className="ph-input" type="number" min={0} max={600} placeholder="No limit" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        Their vibe (behavior)
        <select className="ph-select" value={prefBehavior} onChange={(e) => setPrefBehavior(e.target.value as MatchBehaviorPreference)}>
          {PREF_BEHAVIOR_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {PREF_BEHAVIOR_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        Their breed (exact match, optional)
        <input
          className="ph-input"
          placeholder="e.g. British Shorthair — leave empty for any"
          value={prefBreed}
          onChange={(e) => setPrefBreed(e.target.value)}
        />
      </label>
      {localErr && <div style={{ color: "#b42318", gridColumn: "1 / -1", fontSize: "0.85rem" }}>{localErr}</div>}
      <button className="ph-btn" type="submit" disabled={saving} style={{ gridColumn: "1 / -1", justifySelf: "start" }}>
        {saving ? "Saving…" : "Save PawMatch settings"}
      </button>
    </form>
  );
}

export function CatsPage() {
  const [cats, setCats] = useState<CatDto[]>([]);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "">("");
  const [bio, setBio] = useState("");
  const [behavior, setBehavior] = useState<CatBehavior | "">("");
  const [prefGender, setPrefGender] = useState<MatchGenderPreference>("ANY");
  const [prefMinAge, setPrefMinAge] = useState("");
  const [prefMaxAge, setPrefMaxAge] = useState("");
  const [prefBehavior, setPrefBehavior] = useState<MatchBehaviorPreference>("ANY");
  const [prefBreed, setPrefBreed] = useState("");
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
          prefLookingForGender: prefGender,
          prefMinAgeMonths: prefMinAge === "" ? null : Number(prefMinAge),
          prefMaxAgeMonths: prefMaxAge === "" ? null : Number(prefMaxAge),
          behavior: behavior === "" ? null : behavior,
          prefBehavior,
          prefBreed: prefBreed.trim() === "" ? null : prefBreed.trim(),
        }),
      });
      setName("");
      setBreed("");
      setAge("");
      setGender("");
      setBio("");
      setBehavior("");
      setPrefGender("ANY");
      setPrefMinAge("");
      setPrefMaxAge("");
      setPrefBehavior("ANY");
      setPrefBreed("");
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
            <li key={c.id} style={{ marginBottom: "1.25rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              {c.photoUrls?.length ? (
                <img src={c.photoUrls[0]} alt={c.name} style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: "var(--color-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.75rem",
                  }}
                >
                  🐱
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{c.name}</strong>
                {c.gender && <span style={{ marginLeft: "0.4rem", fontSize: "0.8rem", color: "var(--color-muted)" }}>{GENDER_LABEL[c.gender]}</span>}
                {c.breed ? <span style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}> · {c.breed}</span> : null}
                {c.ageMonths != null ? <span style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}> · {c.ageMonths} mo</span> : null}
                {c.behavior ? (
                  <span style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}> · {BEHAVIOR_LABEL[c.behavior]}</span>
                ) : null}
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
                <CatPawMatchPrefsForm cat={c} onSaved={load} />
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
        <p style={{ marginTop: 0, fontSize: "0.9rem", color: "var(--color-muted)" }}>
          PawMatch matches on gender, age, <strong>vibe</strong>, and optional <strong>breed</strong>. Both cats must fit each other&apos;s filters.
        </p>
        <form onSubmit={onCreate} className="ph-grid">
          <label>
            Name
            <input className="ph-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Breed
            <input className="ph-input" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Shown on profile"
            />
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
          <label style={{ gridColumn: "1 / -1" }}>
            Usual vibe (behavior)
            <select className="ph-select" value={behavior} onChange={(e) => setBehavior(e.target.value as CatBehavior | "")}>
              <option value="">Not set yet</option>
              {(Object.keys(BEHAVIOR_LABEL) as CatBehavior[]).map((k) => (
                <option key={k} value={k}>
                  {BEHAVIOR_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Bio
            <textarea className="ph-textarea" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <div style={{ gridColumn: "1 / -1", fontWeight: 600, fontSize: "0.9rem", marginTop: "0.25rem" }}>PawMatch — who can this cat see?</div>
          <label style={{ gridColumn: "1 / -1" }}>
            Show me (gender)
            <select className="ph-select" value={prefGender} onChange={(e) => setPrefGender(e.target.value as MatchGenderPreference)}>
              {(Object.keys(PREF_LOOKING_LABEL) as MatchGenderPreference[]).map((k) => (
                <option key={k} value={k}>
                  {PREF_LOOKING_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Their min age (mo.)
            <input className="ph-input" value={prefMinAge} onChange={(e) => setPrefMinAge(e.target.value)} type="number" min="0" max="600" placeholder="0" />
          </label>
          <label>
            Their max age (mo.)
            <input className="ph-input" value={prefMaxAge} onChange={(e) => setPrefMaxAge(e.target.value)} type="number" min="0" max="600" placeholder="No limit" />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Their vibe (behavior)
            <select className="ph-select" value={prefBehavior} onChange={(e) => setPrefBehavior(e.target.value as MatchBehaviorPreference)}>
              {PREF_BEHAVIOR_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {PREF_BEHAVIOR_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Their breed (exact match, optional)
            <input
              className="ph-input"
              value={prefBreed}
              onChange={(e) => setPrefBreed(e.target.value)}
              placeholder="Must match the other cat’s breed field"
            />
          </label>
          {err && <div style={{ color: "#b42318", gridColumn: "1 / -1" }}>{err}</div>}
          <button className="ph-btn ph-btn-primary" type="submit">
            Save cat
          </button>
        </form>
      </div>
    </div>
  );
}
