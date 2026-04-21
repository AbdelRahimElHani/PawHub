/** Two-letter initials for default avatars when no photo is set. */
export function userInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }
  return displayName.trim().slice(0, 2).toUpperCase() || "?";
}
