import type { AuthUser } from "./AuthContext";

/** Server-approved veterinarian (PawVet triage). */
export function canWorkAsVerifiedVet(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.accountType === "VET" && user.vetVerificationStatus === "APPROVED";
}
