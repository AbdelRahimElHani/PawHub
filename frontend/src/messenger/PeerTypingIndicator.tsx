type PeerTypingIndicatorProps = {
  displayName: string;
  /** Compact line under chat header title */
  layout: "header";
} | {
  displayName: string;
  /** Bubble + caption at bottom of thread (incoming side) */
  layout: "thread";
};

/** Animated “someone is typing” — STOMP events already drive visibility in MessengerWorkspace. */
export function PeerTypingIndicator(props: PeerTypingIndicatorProps) {
  const { displayName } = props;
  const label = `${displayName} is typing`;

  if (props.layout === "header") {
    return (
      <div className="ph-msg-typing-hint" role="status" aria-live="polite" aria-label={label}>
        <span className="ph-msg-typing-dots ph-msg-typing-dots--sm" aria-hidden>
          <span className="ph-msg-typing-dot" />
          <span className="ph-msg-typing-dot" />
          <span className="ph-msg-typing-dot" />
        </span>
        <span className="ph-msg-typing-hint-text">
          <span className="ph-msg-typing-hint-name">{displayName}</span>
          <span className="ph-msg-typing-hint-action">typing</span>
        </span>
      </div>
    );
  }

  return (
    <div className="ph-msg-typing-thread" role="status" aria-live="polite" aria-label={label}>
      <div className="ph-msg-typing-bubble" aria-hidden>
        <span className="ph-msg-typing-dots ph-msg-typing-dots--lg">
          <span className="ph-msg-typing-dot" />
          <span className="ph-msg-typing-dot" />
          <span className="ph-msg-typing-dot" />
        </span>
      </div>
      <div className="ph-msg-typing-thread-caption">
        <span className="ph-msg-typing-thread-name">{displayName}</span>
        <span className="ph-msg-typing-thread-word">typing</span>
      </div>
    </div>
  );
}
