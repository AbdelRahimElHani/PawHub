import type { UserBadge } from "../../types";
import { Badge } from "../atoms/Badge";

const LABEL: Record<UserBadge, string> = {
  NEW_CAT_PARENT: "New Cat Parent",
  VERIFIED_EXPERT: "Verified Expert",
  SHELTER_PARTNER: "Shelter Partner",
  TOP_CONTRIBUTOR: "Top Contributor",
};

export function UserBadges({ badges }: { badges: UserBadge[] }) {
  if (!badges.length) return null;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "0.25rem" }}>
      {badges.map((b) => (
        <Badge key={b} variant={b === "VERIFIED_EXPERT" ? "sage" : "salmon"}>
          {LABEL[b]}
        </Badge>
      ))}
    </span>
  );
}
