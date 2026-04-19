import { Check, Copy } from "lucide-react";
import { useState } from "react";

type Variant = "messaging" | "whisker-user" | "whisker-bot";

const VARIANT_CLASS: Record<Variant, string> = {
  messaging: "ph-msg-copy-btn",
  "whisker-user": "whisker-copy-btn whisker-copy-btn--user",
  "whisker-bot": "whisker-copy-btn whisker-copy-btn--bot",
};

type Props = {
  text: string;
  variant?: Variant;
  /** Extra class on the wrapper row */
  className?: string;
};

export function CopyMessageButton({ text, variant = "messaging", className }: Props) {
  const [copied, setCopied] = useState(false);
  const trimmed = text.trim();
  if (!trimmed) return null;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard denied */
    }
  }

  return (
    <div className={"ph-copy-wrap " + (className ?? "")}>
      <button
        type="button"
        className={VARIANT_CLASS[variant] + (copied ? " ph-copy-btn--success" : "")}
        onClick={() => void onCopy()}
        title={copied ? "Copied to clipboard" : "Copy message"}
        aria-label={copied ? "Copied to clipboard" : "Copy message"}
      >
        {copied ? <Check size={13} strokeWidth={2.25} aria-hidden /> : <Copy size={13} strokeWidth={2} aria-hidden />}
        {copied ? (
          <span className="ph-copy-done-label" role="status" aria-live="polite">
            Copied to clipboard
          </span>
        ) : null}
      </button>
    </div>
  );
}
