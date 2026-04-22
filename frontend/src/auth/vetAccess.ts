import type { AuthUser } from "./AuthContext";

/** Platform administrator (PawVet credentialing, shelters, etc.). */
export function isAdminAccount(user: AuthUser | null): boolean {
  return user?.role === "ADMIN";
}

/** Logged-in user is registered as a veterinarian (any credentialing state). */
export function isVeterinarianAccount(user: AuthUser | null): boolean {
  return user?.accountType === "VET";
}

/** Server-approved veterinarian (PawVet triage). */
export function canWorkAsVerifiedVet(user: AuthUser | null): boolean {
  if (!user || user.accountType !== "VET") return false;
  const s = String(user.vetVerificationStatus ?? "")
    .trim()
    .toUpperCase();
  return s === "APPROVED";
}
