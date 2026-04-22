import { motion } from "framer-motion";
import type { EnrichedCat } from "../catTypes";
import { VIBE_OPTIONS } from "../catTypes";

/** Stable hash for per-card visual variety (gradient angle, etc.). */
function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return Math.abs(h);
}

/** Roughly readable text on a tint of `hex` (for vibe pill). */
function readableOnPrimary(hex: string): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return "#1c1917";
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.55 ? "#1c1917" : "#fafaf9";
}

type Props = {
  cat: EnrichedCat;
  onOpen: () => void;
};

export function CatCard({ cat, onOpen }: Props) {
  const photoUrl = cat.photoUrls?.[0] ?? null;
  const vibe = VIBE_OPTIONS.find((v) => v.id === cat.vibe);
  const vibeLabel = vibe?.label ?? cat.vibe;
  const vibeHint = vibe?.hint ?? "";
  const { primary: p, accent: a } = cat.colorPalette;

  const h = strHash(`${cat.id}-${cat.name}`);
  const photoAngle = 95 + (h % 75);

  const tagFg = readableOnPrimary(p);

  const age =
    cat.ageMonths != null ? `${cat.ageMonths} mo` : cat.birthday ? new Date(cat.birthday).toLocaleDateString() : "—";

  const cardStyle = {
    "--cat-p": p,
    "--cat-a": a,
    "--cat-photo-angle": `${photoAngle}deg`,
  } as React.CSSProperties;

  return (
    <motion.article
      layout
      className="cats-card"
      style={cardStyle}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`View ${cat.name}'s profile`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <div className="cats-card-photo-wrap">
        {photoUrl ? (
          <motion.img
            layoutId={`cat-photo-${cat.id}`}
            src={photoUrl}
            alt=""
            className="cats-card-photo"
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          />
        ) : (
          <div className="cats-card-photo cats-card-photo--placeholder" aria-hidden>
            🐱
          </div>
        )}
      </div>
      <div className="cats-card-body">
        <div className="cats-card-title-row">
          <h3 className="cats-card-name">{cat.name}</h3>
        </div>
        <p className="cats-card-meta">
          {cat.breed?.trim() || cat.visionProfile?.breedGuess || "Mixed"}
          {cat.gender ? ` · ${cat.gender === "MALE" ? "♂" : "♀"}` : ""} · {age}
        </p>
        {cat.visionProfile?.coatPattern && cat.visionProfile.source === "gemini" ? (
          <p className="cats-card-meta" style={{ marginTop: "0.15rem", fontSize: "0.75rem" }}>
            From photo: {cat.visionProfile.coatPattern.replace(/_/g, " ")} · {cat.visionProfile.bodySize}
          </p>
        ) : null}
        <div className="cats-vibe-row">
          <span
            className="cats-vibe-tag"
            style={{
              background: `color-mix(in srgb, ${p} 26%, white)`,
              color: tagFg,
              border: `1px solid color-mix(in srgb, ${p} 38%, transparent)`,
            }}
          >
            {vibeLabel}
          </span>
          <div className="cats-palette-dots" aria-hidden title="Card accent colors">
            <span className="cats-palette-dot" style={{ background: p }} />
            <span className="cats-palette-dot" style={{ background: a }} />
          </div>
        </div>
        {vibeHint ? (
          <p className="cats-card-hint" style={{ color: `color-mix(in srgb, ${p} 45%, var(--color-muted))` }}>
            {vibeHint}
          </p>
        ) : null}
        <div className="cats-card-cta">
          <span>View details →</span>
        </div>
      </div>
    </motion.article>
  );
}
