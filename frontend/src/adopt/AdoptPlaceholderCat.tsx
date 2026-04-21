/** Warm, minimal cat silhouette for listings without a photo. */
export function AdoptPlaceholderCat() {
  return (
    <svg viewBox="0 0 120 120" fill="currentColor" aria-hidden>
      <ellipse cx="58" cy="72" rx="38" ry="28" />
      <circle cx="58" cy="38" r="22" />
      <path d="M38 28 L32 8 L48 22 Z" />
      <path d="M78 28 L88 8 L72 22 Z" />
      <path d="M44 88 Q58 98 72 88" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
