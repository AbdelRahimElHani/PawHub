export type ReverseGeocodedPlace = {
  /** Human-readable line for UI */
  cityText: string;
  /** Primary locality for filters / listing.city */
  city: string;
  /** State / province / region for listing.region */
  region: string;
  /** Country name (e.g. United States) for listing.country */
  country: string;
};

/**
 * Reverse-geocode coordinates via Nominatim (same policy as map tiles: light use).
 */
export async function reverseGeocodeNominatim(lat: number, lng: number): Promise<ReverseGeocodedPlace | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&zoom=12&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        // Nominatim asks for a valid UA when used from apps
        "User-Agent": "Pawhub/1.0 (market listing location)",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const city =
      a.city ??
      a.town ??
      a.village ??
      a.municipality ??
      a.hamlet ??
      a.suburb ??
      a.neighbourhood ??
      a.county ??
      "";
    const region = a.state ?? a.region ?? a["ISO3166-2-lvl4"] ?? "";
    const country = a.country ?? "";
    const cityText = [city, region, country].filter(Boolean).join(", ");
    if (!city.trim() && !country.trim()) return null;
    return { cityText, city: city.trim(), region: region.trim(), country: country.trim() };
  } catch {
    return null;
  }
}
