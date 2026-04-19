const R = 6371; // Earth's radius in km

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Returns the great-circle distance in kilometres between two lat/lng points.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Human-readable distance string, e.g. "1.2 km away" or "0.8 km away". */
export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km away`;
}
