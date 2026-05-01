/** Notification kinds that open a full-detail moderation dialog (admin reason in body). */
const MODERATION_DETAIL_KINDS = new Set([
  "ADMIN_PAW_MARKET_USER_WARNED",
  "ADMIN_PAW_MARKET_USER_BANNED",
  "ADMIN_PAW_ADOPT_SHELTER_WARNED",
  "ADMIN_PAW_ADOPT_SHELTER_BANNED",
  "MARKET_LISTING_REMOVED_ADMIN",
  "ADOPTION_LISTING_REMOVED_ADMIN",
  "VET_LICENSE_APPLICATION_REJECTED",
  "FORUM_POST_REMOVED_ADMIN",
]);

export function isModerationDetailKind(kind: string | undefined | null): boolean {
  if (!kind) return false;
  return MODERATION_DETAIL_KINDS.has(kind);
}

export function moderationNoticeLabel(kind: string): string {
  switch (kind) {
    case "ADMIN_PAW_MARKET_USER_WARNED":
    case "ADMIN_PAW_ADOPT_SHELTER_WARNED":
      return "Warning";
    case "ADMIN_PAW_MARKET_USER_BANNED":
    case "ADMIN_PAW_ADOPT_SHELTER_BANNED":
      return "Restriction";
    case "MARKET_LISTING_REMOVED_ADMIN":
    case "ADOPTION_LISTING_REMOVED_ADMIN":
      return "Listing removed";
    case "VET_LICENSE_APPLICATION_REJECTED":
      return "Vet application";
    case "FORUM_POST_REMOVED_ADMIN":
      return "Thread removed";
    default:
      return "Notice";
  }
}
