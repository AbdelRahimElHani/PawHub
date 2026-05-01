export type MediaLightboxKind = "image" | "video" | "pdf" | "other";

export function inferMediaLightboxKind(url: string): MediaLightboxKind {
  const lower = url.toLowerCase();
  if (lower.includes("application/pdf") || /\.pdf(\?|#|$)/i.test(url)) {
    return "pdf";
  }
  try {
    const path = new URL(url, "https://example.com").pathname.toLowerCase();
    if (/\.pdf(\?|$)/i.test(path)) return "pdf";
    if (/\.(mp4|webm|ogg|mov|m4v|ogv)(\?|$)/i.test(path)) return "video";
    if (/\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|ico|heic|heif)(\?|$)/i.test(path)) return "image";
  } catch {
    /* relative or odd URL — fall through */
  }
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)) return "video";
  if (/\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i.test(url)) return "image";
  return "other";
}

/** True when the URL is safe to show inside the in-app viewer (not a random HTML page). */
export function isPreviewableMediaUrl(url: string): boolean {
  return inferMediaLightboxKind(url) !== "other";
}
