import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { CatDto } from "../types";
import { VIBE_OPTIONS } from "../cats/catTypes";
import type { CatEnrichment, EnrichedCat } from "../cats/catTypes";
import { mergeCat } from "../cats/catTypes";
import { useCatSanctuaryStore } from "../cats/useCatSanctuaryStore";
import "../cats/cats.css";

const ENRICHMENT_KEY = "pawhub_cat_sanctuary_v1";

function storedEnrichmentFor(catId: number): Partial<CatEnrichment> | undefined {
  try {
    const raw = localStorage.getItem(ENRICHMENT_KEY);
    if (!raw) return undefined;
    const p = JSON.parse(raw) as Record<string, unknown>;
    const row = p[String(catId)];
    return row && typeof row === "object" ? (row as Partial<CatEnrichment>) : undefined;
  } catch {
    return undefined;
  }
}

export function CatDetailPage() {
  const { catId } = useParams();
  const nav = useNavigate();
  const id = catId ? Number.parseInt(catId, 10) : NaN;
  const fetchCats = useCatSanctuaryStore((s) => s.fetchCats);
  const catsFromStore = useCatSanctuaryStore((s) => s.cats);

  const [cat, setCat] = useState<EnrichedCat | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(id) || id < 1) {
      setErr("Invalid cat.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setErr(null);
      setLoading(true);
      try {
        const dto = await api<CatDto>(`/api/cats/${id}`);
        await fetchCats();
        if (cancelled) return;
        const fromStore = useCatSanctuaryStore.getState().cats.find((c) => c.id === dto.id);
        if (fromStore) {
          setCat(fromStore);
        } else {
          setCat(mergeCat(dto, storedEnrichmentFor(dto.id)));
        }
      } catch {
        if (!cancelled) setErr("We could not load this cat. It may not exist or you may not have access.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, fetchCats]);

  useEffect(() => {
    if (!Number.isFinite(id) || id < 1) return;
    const fromStore = catsFromStore.find((c) => c.id === id);
    if (fromStore) setCat(fromStore);
  }, [catsFromStore, id]);

  const vibeLabel = useMemo(() => {
    if (!cat) return "";
    return VIBE_OPTIONS.find((v) => v.id === cat.vibe)?.label ?? cat.vibe;
  }, [cat]);

  if (!Number.isFinite(id) || id < 1) {
    return (
      <div className="cats-sanctuary" style={{ padding: "1.5rem" }}>
        <p className="cats-err">Invalid link.</p>
        <Link className="ph-btn ph-btn-primary" to="/cats">
          Back to My cats
        </Link>
      </div>
    );
  }

  if (loading && !cat) {
    return (
      <div className="cats-sanctuary" style={{ padding: "2rem", textAlign: "center" }}>
        <div className="cats-paw-spinner-inner" style={{ margin: "0 auto 1rem" }} />
        <p style={{ color: "var(--color-muted)" }}>Loading…</p>
      </div>
    );
  }

  if (err || !cat) {
    return (
      <div className="cats-sanctuary" style={{ padding: "1.5rem" }}>
        <p className="cats-err">{err ?? "Cat not found."}</p>
        <Link className="ph-btn ph-btn-primary" to="/cats">
          Back to My cats
        </Link>
      </div>
    );
  }

  const age =
    cat.ageMonths != null ? `${cat.ageMonths} months old` : cat.birthday ? `Born ${new Date(cat.birthday).toLocaleDateString()}` : "Age not set";

  return (
    <div className="cats-sanctuary">
      <motion.div className="cats-detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="cats-detail-toolbar">
          <button type="button" className="ph-btn ph-btn-ghost" onClick={() => nav(-1)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={18} aria-hidden />
            Back
          </button>
          <Link className="ph-btn ph-btn-ghost" to="/cats">
            All cats
          </Link>
        </div>

        <header className="cats-detail-header">
          <div className="cats-detail-hero-photo">
            {cat.photoUrls?.[0] ? (
              <img src={cat.photoUrls[0]} alt="" className="cats-detail-cover" />
            ) : (
              <div className="cats-detail-cover cats-detail-cover--placeholder" aria-hidden>
                🐱
              </div>
            )}
          </div>
          <div className="cats-detail-intro">
            <h1 className="cats-detail-name">{cat.name}</h1>
            <p className="cats-detail-meta">
              {cat.breed?.trim() || cat.visionProfile?.breedGuess || "Mixed"}
              {cat.gender ? ` · ${cat.gender === "MALE" ? "Male" : "Female"}` : ""} · {age}
            </p>
            <p className="cats-detail-meta">
              <span className="cats-vibe-tag" style={{ display: "inline-block", marginTop: "0.35rem" }}>
                {vibeLabel}
              </span>
            </p>
            {cat.bio?.trim() ? (
              <p className="cats-detail-bio">{cat.bio}</p>
            ) : (
              <p className="cats-detail-bio" style={{ color: "var(--color-muted)", fontStyle: "italic" }}>
                No bio yet — you can add one when profile editing is available.
              </p>
            )}
          </div>
        </header>

        {cat.photoUrls && cat.photoUrls.length > 1 ? (
          <section className="cats-detail-section">
            <h2>Photos</h2>
            <div className="cats-detail-gallery">
              {cat.photoUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="cats-detail-thumb">
                  <img src={url} alt="" />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {cat.visionProfile && cat.visionProfile.source === "gemini" ? (
          <section className="cats-detail-section">
            <h2>Photo insights</h2>
            <p style={{ margin: "0 0 0.5rem", color: "var(--color-muted)", fontSize: "0.9rem" }}>
              From your upload when this profile was created (AI-assisted, not a medical diagnosis).
            </p>
            <ul className="cats-detail-facts">
              <li>
                <strong>Coat</strong> {cat.visionProfile.coatPattern.replace(/_/g, " ")}
              </li>
              <li>
                <strong>Build</strong> {cat.visionProfile.bodySize}
              </li>
              {cat.visionProfile.breedGuess ? (
                <li>
                  <strong>Breed guess</strong> {cat.visionProfile.breedGuess}
                </li>
              ) : null}
              <li>
                <strong>Activity (1–5)</strong> {cat.visionProfile.activityLevel}
              </li>
              {cat.visionProfile.notes ? (
                <li>
                  <strong>Notes</strong> {cat.visionProfile.notes}
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}
      </motion.div>
    </div>
  );
}
