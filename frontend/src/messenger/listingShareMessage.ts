/**
 * Automated Paw Market messages append "View listing: …/market/{id}".
 * We strip that line for display and render an embed card instead (Instagram-style share).
 */
/** Matches trailing “View listing:” line (with optional SPA origin) so we can replace it with an embed. */
const TRAILING_LISTING_LINE =
  /(?:\r?\n)+View listing:\s*(?:https?:\/\/[^\s]+?)?\/market\/(\d+)\s*$/i;

export function parseListingShareFromMessage(body: string): { text: string; listingId: number | null } {
  const m = body.match(TRAILING_LISTING_LINE);
  if (!m) {
    return { text: body, listingId: null };
  }
  const id = Number(m[1]);
  const text = body.slice(0, m.index).trimEnd();
  return { text, listingId: Number.isFinite(id) && id > 0 ? id : null };
}
