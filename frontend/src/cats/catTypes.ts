import type { CatDto } from "../types";

export type CatVibe = "calm" | "playful" | "lazy" | "grumpy" | "adventurous" | "royal";

export type ColorPalette = {
  primary: string;
  accent: string;
};

/** Gemini vision output for sanctuary presets (matches backend CatVisionProfileDto). */
export type CatVisionProfile = {
  isDomesticCat: boolean;
  primaryCoatHex: string;
  secondaryCoatHex: string;
  coatPattern: string;
  bodySize: string;
  breedGuess: string | null;
  activityLevel: number;
  notes: string;
  source: string;
};

export type CatEnrichment = {
  vibe: CatVibe;
  colorPalette: ColorPalette;
  position: [number, number, number];
  /** ISO date string — client-only, not on server */
  birthday?: string;
  /** From POST /api/cats/vision-profile when adding a photo */
  visionProfile?: CatVisionProfile;
};

export type EnrichedCat = CatDto & CatEnrichment;

export const VIBE_OPTIONS: { id: CatVibe; label: string; hint: string }[] = [
  { id: "calm", label: "Calm", hint: "gentle strolls" },
  { id: "playful", label: "Playful", hint: "bouncy & quick" },
  { id: "lazy", label: "Lazy", hint: "slow & cozy" },
  { id: "grumpy", label: "Grumpy", hint: "dramatic pauses" },
  { id: "adventurous", label: "Adventurous", hint: "fast explorer" },
  { id: "royal", label: "Royal", hint: "dignified pace" },
];

export function defaultVibeForName(name: string): CatVibe {
  const n = name.trim().toLowerCase();
  if (n.includes("luna")) return "calm";
  if (n.includes("mochi")) return "playful";
  return "calm";
}

export function defaultPaletteForVibe(vibe: CatVibe): ColorPalette {
  switch (vibe) {
    case "playful":
      return { primary: "#ea580c", accent: "#facc15" };
    case "lazy":
      return { primary: "#a78bfa", accent: "#c4b5fd" };
    case "grumpy":
      return { primary: "#78716c", accent: "#f87171" };
    case "adventurous":
      return { primary: "#16a34a", accent: "#4ade80" };
    case "royal":
      return { primary: "#7c3aed", accent: "#fbbf24" };
    case "calm":
    default:
      return { primary: "#94a3b8", accent: "#f4b942" };
  }
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return Math.abs(h);
}

/** HSL (0–360, 0–100, 0–100) → #rrggbb */
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(100, Math.max(0, s)) / 100;
  l = Math.min(100, Math.max(0, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/**
 * Stable, distinct primary/accent pair per cat so gallery cards don’t all look the same
 * when local data only had vibe (or old auto-defaults). Biased by vibe, varied by id + name.
 */
export function distinctPaletteForCat(id: number, name: string, vibe: CatVibe): ColorPalette {
  const centers: Record<CatVibe, { h: number; s: number; l: number }> = {
    calm: { h: 205, s: 40, l: 52 },
    playful: { h: 26, s: 76, l: 53 },
    lazy: { h: 262, s: 50, l: 58 },
    grumpy: { h: 28, s: 22, l: 44 },
    adventurous: { h: 145, s: 54, l: 46 },
    royal: { h: 278, s: 56, l: 48 },
  };
  const base = centers[vibe];
  const seed = id * 374761393 + hashString(name.trim() || "cat");
  const dh = (seed % 52) - 26;
  const ds = ((seed >> 7) % 23) - 11;
  const dl = ((seed >> 15) % 17) - 8;
  const h1 = (base.h + dh + 360) % 360;
  const s1 = Math.min(88, Math.max(22, base.s + ds));
  const l1 = Math.min(62, Math.max(34, base.l + dl));
  const h2 = (h1 + 36 + ((seed >> 3) % 28)) % 360;
  const s2 = Math.min(86, Math.max(38, s1 + 8));
  const l2 = Math.min(80, Math.max(50, l1 + 16));
  return {
    primary: hslToHex(h1, s1, l1),
    accent: hslToHex(h2, s2, l2),
  };
}

export function isVibeTemplatePalette(p: ColorPalette, vibe: CatVibe): boolean {
  const d = defaultPaletteForVibe(vibe);
  return p.primary.toLowerCase() === d.primary.toLowerCase() && p.accent.toLowerCase() === d.accent.toLowerCase();
}

/** Rewrite stored “vibe default” swatches so each cat id gets its own colors (one-time migration per load). */
export function migrateTemplatePalettesToDistinct(
  cats: { id: number; name: string }[],
  map: Record<string, CatEnrichment>,
): { map: Record<string, CatEnrichment>; changed: boolean } {
  let changed = false;
  const out: Record<string, CatEnrichment> = { ...map };
  for (const cat of cats) {
    const key = String(cat.id);
    const e = out[key];
    if (!e?.colorPalette) continue;
    const vibe = e.vibe ?? defaultVibeForName(cat.name);
    if (!isVibeTemplatePalette(e.colorPalette, vibe)) continue;
    out[key] = {
      ...e,
      colorPalette: distinctPaletteForCat(cat.id, cat.name, vibe),
    };
    changed = true;
  }
  return { map: out, changed };
}

export function mergeCat(cat: CatDto, enrichment: Partial<CatEnrichment> | undefined): EnrichedCat {
  const vibe = enrichment?.vibe ?? defaultVibeForName(cat.name);
  const stored = enrichment?.colorPalette;
  const colorPalette =
    !stored || isVibeTemplatePalette(stored, vibe)
      ? distinctPaletteForCat(cat.id, cat.name, vibe)
      : stored;
  const position: [number, number, number] = enrichment?.position ?? [0, 0, 0];
  return {
    ...cat,
    vibe,
    colorPalette,
    position,
    birthday: enrichment?.birthday,
    visionProfile: enrichment?.visionProfile,
  };
}
