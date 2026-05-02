import { CheckCircle, XCircle } from "lucide-react";
import type { ReactNode } from "react";

export type CatCheckUiState =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "passed"; reason: string }
  | { state: "failed"; reason: string }
  | { state: "skipped" }
  | { state: "unavailable"; message: string };

export type CatCheckBannerCopy = {
  checkingTitle: string;
  checkingSub: string;
  passedTitle: string;
  failedTitle: string;
  failedHint: string;
  skippedTitle: string;
  skippedSub: string;
};

/** Paw Market product listing (Step 1 — image only). */
export const CAT_CHECK_COPY_MARKET_IMAGE: CatCheckBannerCopy = {
  checkingTitle: "Scanning for Cat-ness…",
  checkingSub: "Gemini is analysing your image. This takes 2–5 seconds.",
  passedTitle: "✅ Cat-ness Confirmed!",
  failedTitle: "🚫 Cat-Check Failed",
  failedHint: "Use a clear photo of cat-related merchandise (food, toys, tree, litter, etc.).",
  skippedTitle: "Live scan skipped",
  skippedSub: "We’ll still verify this photo when you publish. You can keep editing your listing.",
};

/** Paw Adopt hero photo (Step 1 — real cat in frame). */
export const CAT_CHECK_COPY_ADOPT_IMAGE: CatCheckBannerCopy = {
  checkingTitle: "Scanning your adoption photo…",
  checkingSub: "Gemini is checking that this looks like a real cat as the main subject. Usually 2–5 seconds.",
  passedTitle: "✅ Cat photo confirmed",
  failedTitle: "🚫 Photo check failed",
  failedHint:
    "Upload a clear photo of the cat you’re listing—real cats only, not drawings, products-only shots, or unrelated images.",
  skippedTitle: "Live scan skipped",
  skippedSub: "Your photo will still be checked when you publish (if AI is enabled on the server).",
};

export function CatCheckVerificationBanners({
  catCheck,
  copy,
  variant = "below",
}: {
  catCheck: CatCheckUiState;
  copy: CatCheckBannerCopy;
  /** `onImage`: fixed to the bottom of a `position: relative` upload preview (photo visible behind). */
  variant?: "below" | "onImage";
}) {
  const onImage = variant === "onImage";
  const marginTop = onImage ? 0 : "0.6rem";
  const boxPad = onImage ? "0.5rem 0.62rem" : "0.75rem 1rem";
  const iconSize = onImage ? 16 : 18;

  let inner: ReactNode = null;

  if (catCheck.state === "checking") {
    inner = (
      <div
        className="pm-ai-banner"
        style={{
          marginTop,
          padding: onImage ? "0.5rem 0.65rem" : undefined,
          gap: onImage ? "0.5rem" : undefined,
        }}
      >
        <span className="pm-paw-spin">🐾</span>
        <div>
          <strong style={{ fontSize: onImage ? "0.82rem" : "0.9rem" }}>{copy.checkingTitle}</strong>
          <p
            style={{
              margin: "0.08rem 0 0",
              fontSize: onImage ? "0.76rem" : "0.82rem",
              color: "var(--color-muted)",
              lineHeight: 1.35,
            }}
          >
            {copy.checkingSub}
          </p>
        </div>
      </div>
    );
  } else if (catCheck.state === "passed") {
    inner = (
      <div
        style={{
          marginTop,
          background: "#f0fdf4",
          border: "1.5px solid #6ee7b7",
          borderRadius: onImage ? 8 : 10,
          padding: boxPad,
          display: "flex",
          gap: "0.6rem",
          alignItems: "flex-start",
        }}
      >
        <CheckCircle size={iconSize} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong style={{ color: "#065f46", fontSize: onImage ? "0.8rem" : "0.88rem" }}>{copy.passedTitle}</strong>
          <p style={{ margin: "0.15rem 0 0", fontSize: onImage ? "0.76rem" : "0.82rem", color: "#047857", lineHeight: 1.35 }}>
            {catCheck.reason}
          </p>
        </div>
      </div>
    );
  } else if (catCheck.state === "failed") {
    inner = (
      <div
        style={{
          marginTop,
          background: "#fff1f0",
          border: "1.5px solid #fca5a5",
          borderRadius: onImage ? 8 : 10,
          padding: boxPad,
          display: "flex",
          gap: "0.6rem",
          alignItems: "flex-start",
        }}
      >
        <XCircle size={iconSize} color="#b91c1c" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong style={{ color: "#b91c1c", fontSize: onImage ? "0.8rem" : "0.88rem" }}>{copy.failedTitle}</strong>
          <p style={{ margin: "0.15rem 0 0", fontSize: onImage ? "0.76rem" : "0.82rem", color: "#7f1d1d", lineHeight: 1.35 }}>
            {catCheck.reason}
          </p>
          {!onImage ? (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#991b1b" }}>{copy.failedHint}</p>
          ) : (
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.74rem", color: "#991b1b", lineHeight: 1.35 }}>{copy.failedHint}</p>
          )}
        </div>
      </div>
    );
  } else if (catCheck.state === "skipped") {
    inner = (
      <div
        style={{
          marginTop,
          background: "#fffbeb",
          border: "1.5px solid #fcd34d",
          borderRadius: onImage ? 8 : 10,
          padding: boxPad,
        }}
      >
        <strong style={{ color: "#92400e", fontSize: onImage ? "0.8rem" : "0.88rem" }}>{copy.skippedTitle}</strong>
        <p style={{ margin: "0.15rem 0 0", fontSize: onImage ? "0.76rem" : "0.82rem", color: "#78350f", lineHeight: 1.35 }}>
          {copy.skippedSub}
        </p>
      </div>
    );
  } else if (catCheck.state === "unavailable") {
    inner = (
      <div
        style={{
          marginTop,
          background: onImage ? "rgba(255,255,255,0.96)" : "transparent",
          border: onImage ? "1px solid var(--color-border)" : undefined,
          borderRadius: onImage ? 8 : undefined,
          padding: onImage ? boxPad : undefined,
        }}
      >
        <p
          style={{
            margin: onImage ? 0 : "0.5rem 0 0",
            fontSize: onImage ? "0.76rem" : "0.82rem",
            color: onImage ? "#334155" : "var(--color-muted)",
            lineHeight: 1.35,
          }}
        >
          {catCheck.message}
        </p>
      </div>
    );
  }

  if (!inner) return null;

  if (!onImage) return inner;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2,
        padding: "0.35rem 0.45rem 0.5rem",
        background: "linear-gradient(to top, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.35) 50%, transparent 100%)",
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>{inner}</div>
    </div>
  );
}
