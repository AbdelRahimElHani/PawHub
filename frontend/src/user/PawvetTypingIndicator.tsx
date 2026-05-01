/** Distinct from main messenger typing — softer clinical glass + wave bars for PawVet consultation. */
export function PawvetTypingIndicator({ displayName }: { displayName: string }) {
  const label = `${displayName} is composing a reply`;
  return (
    <div className="pawvet-typing-wrap" role="status" aria-live="polite" aria-label={label}>
      <div className="pawvet-typing-card" aria-hidden>
        <div className="pawvet-typing-bars">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="pawvet-typing-bar" style={{ animationDelay: `${i * 0.07}s` }} />
          ))}
        </div>
      </div>
      <div className="pawvet-typing-caption">
        <span className="pawvet-typing-caption-name">{displayName}</span>
        <span className="pawvet-typing-caption-action">is composing a reply</span>
      </div>
    </div>
  );
}
