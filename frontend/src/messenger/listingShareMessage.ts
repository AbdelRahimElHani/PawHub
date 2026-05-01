/**
 * Automated Paw Market messages append "View listing: …/market/{id}".
 * Paw Adopt inquiries append "View adoption listing: …/adopt/{id}".
 * We strip those lines for display and render embed cards instead (same pattern as market).
 */
/** Matches trailing “View listing:” line (with optional SPA origin) so we can replace it with an embed. */
const TRAILING_LISTING_LINE =
  /(?:\r?\n)+View listing:\s*(?:https?:\/\/[^\s]+?)?\/market\/(\d+)\s*$/i;

/** Matches trailing “View adoption listing:” line — opens listing profile in-app, not as raw chat link text. */
const TRAILING_ADOPTION_LISTING_LINE =
  /(?:\r?\n)+View adoption listing:\s*(?:https?:\/\/[^\s]+?)?\/adopt\/(\d+)\s*$/i;

/** Older automated intros used this wording; same URL shape as current adoption share line. */
const TRAILING_LEGACY_VIEW_THIS_CAT_LINE =
  /(?:\r?\n)+View this cat:\s*(?:https?:\/\/[^\s]+?)?\/adopt\/(\d+)\s*$/i;

export function parseListingShareFromMessage(body: string): { text: string; listingId: number | null } {
  const m = body.match(TRAILING_LISTING_LINE);
  if (!m) {
    return { text: body, listingId: null };
  }
  const id = Number(m[1]);
  const text = body.slice(0, m.index).trimEnd();
  return { text, listingId: Number.isFinite(id) && id > 0 ? id : null };
}

export function parseAdoptionShareFromMessage(body: string): { text: string; listingId: number | null } {
  const m =
    body.match(TRAILING_ADOPTION_LISTING_LINE) ?? body.match(TRAILING_LEGACY_VIEW_THIS_CAT_LINE);
  if (!m) {
    return { text: body, listingId: null };
  }
  const id = Number(m[1]);
  const text = body.slice(0, m.index).trimEnd();
  return { text, listingId: Number.isFinite(id) && id > 0 ? id : null };
}

/** Strip market then adoption share trailers (order rarely matters; a message uses at most one). */
export function parseMessageEmbeds(body: string): {
  text: string;
  marketListingId: number | null;
  adoptionListingId: number | null;
} {
  const m1 = parseListingShareFromMessage(body);
  const m2 = parseAdoptionShareFromMessage(m1.text);
  return {
    text: m2.text,
    marketListingId: m1.listingId,
    adoptionListingId: m2.listingId,
  };
}
