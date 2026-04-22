import type { AdoptionListingDto } from "../types";

export type LifestyleFilterId = "all" | "zen" | "cuddle" | "office" | "explorer" | "social";

/** Lifestyle “personality” filters — assigned deterministically per listing id for a stable UX. */
export const LIFESTYLE_FILTERS: { id: LifestyleFilterId; label: string; shortLabel: string }[] = [
  { id: "all", label: "All personalities", shortLabel: "All" },
  { id: "zen", label: "The Zen Master", shortLabel: "Zen" },
  { id: "cuddle", label: "The Cuddle Bug", shortLabel: "Cuddle" },
  { id: "office", label: "Office Assistant", shortLabel: "Office" },
  { id: "explorer", label: "The Explorer", shortLabel: "Explorer" },
  { id: "social", label: "Social Butterfly", shortLabel: "Social" },
];

const LIFESTYLE_KEYS: Exclude<LifestyleFilterId, "all">[] = ["zen", "cuddle", "office", "explorer", "social"];

function stableBucket(id: number): Exclude<LifestyleFilterId, "all"> {
  const u = (id * 2654435761) >>> 0;
  return LIFESTYLE_KEYS[u % LIFESTYLE_KEYS.length];
}

/** Which lifestyle pill this listing belongs to (for filtering). */
export function lifestyleForListing(listing: Pick<AdoptionListingDto, "id">): Exclude<LifestyleFilterId, "all"> {
  return stableBucket(listing.id);
}

/** Short badge line on cards — personality-first copy. */
export function vibeLabelForListing(listing: Pick<AdoptionListingDto, "id">): string {
  const vibe = lifestyleForListing(listing);
  const labels: Record<Exclude<LifestyleFilterId, "all">, string> = {
    zen: "Calm & grounded",
    cuddle: "Highly affectionate",
    office: "Work-from-home pro",
    explorer: "Curious adventurer",
    social: "People-focused",
  };
  return labels[vibe];
}

export function listingMatchesFilter(
  listing: Pick<AdoptionListingDto, "id">,
  filter: LifestyleFilterId,
): boolean {
  if (filter === "all") return true;
  return lifestyleForListing(listing) === filter;
}

/** Quick facts — inferred from free text when possible; otherwise neutral. */
export function inferQuickFacts(description: string | null): {
  kids: boolean | null;
  dogs: boolean | null;
  indoorOnly: boolean | null;
} {
  const d = (description ?? "").toLowerCase();
  let kids: boolean | null = null;
  if (/\b(kids?|children|child|family)\b/.test(d)) kids = true;
  else if (/\b(no (small )?children|not (good )?with (young )?kids?|older (kids|children) only)\b/.test(d)) kids = false;

  let dogs: boolean | null = null;
  if (/\b(no dogs?|not (good )?with dogs?|prefers no dogs?)\b/.test(d)) dogs = false;
  else if (/\b(dogs? ok|good with dogs?|dog-friendly)\b/.test(d)) dogs = true;

  let indoorOnly: boolean | null = null;
  if (/\b(indoor only|inside only|apartment|flat)\b/.test(d)) indoorOnly = true;
  else if (/\b(outdoor|barn|working cat|mouser)\b/.test(d)) indoorOnly = false;

  return { kids, dogs, indoorOnly };
}
