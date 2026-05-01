import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
      <p style={{ gridColumn: "1 / -1", fontSize: "0.82rem", color: "var(--color-muted)", margin: 0, lineHeight: 1.45 }}>
        When both cats have a gender set, <strong>same-gender pairs never appear</strong> in discovery (in addition to
        your filters below).
      </p>
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

function CatDetailModal({
  cat,
  onClose,
  onReload,
}: {
  cat: CatDto;
  onClose: () => void;
  onReload: () => Promise<void>;
}) {
  const [photoErr, setPhotoErr] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`cat-detail-title-${cat.id}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15, 18, 22, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        overflowY: "auto",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ph-surface"
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "min(92vh, 900px)",
          overflowY: "auto",
          padding: "1.25rem",
          borderRadius: 16,
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <h2 id={`cat-detail-title-${cat.id}`} style={{ margin: 0, fontSize: "1.25rem" }}>
            {cat.name}
          </h2>
          <button type="button" className="ph-btn ph-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          {cat.photoUrls?.length ? (
            <img src={cat.photoUrls[0]} alt="" style={{ width: 120, height: 120, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 14,
                flexShrink: 0,
                background: "var(--color-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.25rem",
              }}
              aria-hidden
            >
              🐱
            </div>
          )}
          <div style={{ flex: "1 1 200px", minWidth: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>
            {cat.gender && <div>{GENDER_LABEL[cat.gender]}</div>}
            {cat.breed && <div style={{ color: "var(--color-muted)" }}>{cat.breed}</div>}
            {cat.ageMonths != null && <div style={{ color: "var(--color-muted)" }}>{cat.ageMonths} months old</div>}
            {cat.behavior && <div style={{ color: "var(--color-muted)" }}>{BEHAVIOR_LABEL[cat.behavior]}</div>}
            {cat.bio && <p style={{ margin: "0.5rem 0 0", whiteSpace: "pre-wrap" }}>{cat.bio}</p>}
          </div>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--color-muted)", margin: "1rem 0 0", lineHeight: 1.45 }}>
          Photos are verified with AI when Gemini is enabled: the image must clearly show a <strong>domestic cat</strong>{" "}
          as the main subject.
        </p>
        <div style={{ marginTop: "0.65rem" }}>
          <label style={{ fontSize: "0.88rem", fontWeight: 600 }}>
            Add photo
            <input
              type="file"
              accept="image/*"
              className="ph-input"
              style={{ marginTop: "0.35rem", padding: "0.4rem" }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setPhotoErr(null);
                const fd = new FormData();
                fd.append("file", f);
                try {
                  await api(`/api/cats/${cat.id}/photos`, { method: "POST", body: fd });
                  await onReload();
                } catch (ex: unknown) {
                  setPhotoErr(ex instanceof Error ? ex.message : "Upload failed");
                }
              }}
            />
          </label>
          {photoErr && <p style={{ color: "#b42318", fontSize: "0.85rem", margin: "0.35rem 0 0" }}>{photoErr}</p>}
        </div>
        <CatPawMatchPrefsForm cat={cat} onSaved={onReload} />
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
          <Link className="ph-btn ph-btn-ghost" to={`/cats/${cat.id}`} onClick={onClose}>
            Open sanctuary view →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CatsPage() {
  const [cats, setCats] = useState<CatDto[]>([]);
  const [detailCatId, setDetailCatId] = useState<number | null>(null);
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
  const createPhotoRef = useRef<HTMLInputElement>(null);
  const [createPhotoPreview, setCreatePhotoPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      setCats(await api<CatDto[]>("/api/cats"));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (createPhotoPreview) URL.revokeObjectURL(createPhotoPreview);
    };
  }, [createPhotoPreview]);

  useEffect(() => {
    void load();
  }, [load]);

  const detailCat = detailCatId != null ? cats.find((c) => c.id === detailCatId) : null;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const file = createPhotoRef.current?.files?.[0] ?? null;
    try {
      const created = await api<CatDto>("/api/cats", {
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
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        try {
          await api(`/api/cats/${created.id}/photos`, { method: "POST", body: fd });
        } catch (photoEx: unknown) {
          setErr(
            photoEx instanceof Error
              ? `${photoEx.message} (cat was saved — open details to try another photo.)`
              : "Photo upload failed (cat was saved).",
          );
        }
      }
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
      if (createPhotoPreview) URL.revokeObjectURL(createPhotoPreview);
      setCreatePhotoPreview(null);
      if (createPhotoRef.current) createPhotoRef.current.value = "";
      await load();
      setDetailCatId(created.id);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Create failed");
    }
  }

  function onCreatePhotoPick() {
    const f = createPhotoRef.current?.files?.[0];
    setCreatePhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  return (
    <div className="ph-grid ph-grid-2">
      <div className="ph-surface" style={{ padding: "1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Your cats</h2>
        <p style={{ marginTop: 0, fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
          Overview of your profiles — use <strong>Manage</strong> for photos, PawMatch filters, and sanctuary view.
        </p>
        {err && <p style={{ color: "#b42318" }}>{err}</p>}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1rem",
            marginTop: "0.75rem",
          }}
        >
          {cats.map((c) => (
            <article
              key={c.id}
              className="ph-surface"
              style={{
                padding: "1rem",
                borderRadius: 14,
                border: "1px solid var(--color-border, #e8e8e8)",
                display: "flex",
                flexDirection: "column",
                gap: "0.65rem",
              }}
            >
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                {c.photoUrls?.length ? (
                  <img src={c.photoUrls[0]} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      flexShrink: 0,
                      background: "var(--color-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                    }}
                    aria-hidden
                  >
                    🐱
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", lineHeight: 1.35 }}>
                    {[c.gender ? GENDER_LABEL[c.gender] : null, c.breed, c.ageMonths != null ? `${c.ageMonths} mo` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </div>
              {c.bio && (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {c.bio}
                </p>
              )}
              <button type="button" className="ph-btn ph-btn-primary" style={{ alignSelf: "stretch" }} onClick={() => setDetailCatId(c.id)}>
                Manage
              </button>
            </article>
          ))}
        </div>
        {cats.length === 0 && !err && <p style={{ color: "var(--color-muted)", marginTop: "1rem" }}>No cats yet — add one on the right.</p>}
      </div>

      <div className="ph-surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Add a cat</h3>
        <p style={{ marginTop: 0, fontSize: "0.9rem", color: "var(--color-muted)" }}>
          PawMatch matches on gender, age, <strong>vibe</strong>, and optional <strong>breed</strong>. Both cats must fit each other&apos;s filters.
          Same-gender pairs never see each other when both genders are set.
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginTop: "0.35rem" }}>
          First photo (if any) is checked with AI when Gemini is on — must show your cat clearly.
        </p>
        <form onSubmit={onCreate} className="ph-grid">
          <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
            {createPhotoPreview ? (
              <img
                src={createPhotoPreview}
                alt=""
                style={{ width: 88, height: 88, borderRadius: 12, objectFit: "cover", border: "1px solid var(--color-border)" }}
              />
            ) : (
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 12,
                  background: "var(--color-bg)",
                  border: "1px dashed var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.75rem",
                  flexShrink: 0,
                }}
                aria-hidden
              >
                🐱
              </div>
            )}
            <label style={{ flex: "1 1 200px", margin: 0 }}>
              Photo (optional)
              <input
                ref={createPhotoRef}
                className="ph-input"
                type="file"
                accept="image/*"
                style={{ marginTop: "0.35rem", padding: "0.4rem" }}
                onChange={onCreatePhotoPick}
              />
            </label>
          </div>
          <label>
            Name
            <input className="ph-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Breed
            <input className="ph-input" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Shown on profile" />
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

      {detailCat && (
        <CatDetailModal
          cat={detailCat}
          onClose={() => setDetailCatId(null)}
          onReload={async () => {
            await load();
          }}
        />
      )}
    </div>
  );
}
