import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useState } from "react";

type Props = {
  vetName: string;
  initialStars?: number;
  onSubmit: (stars: number, feedback: string) => void | Promise<void>;
  submitting?: boolean;
};

export function RatingSystem({ vetName, initialStars = 0, onSubmit, submitting }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [stars, setStars] = useState(initialStars);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");

  const active = hover || stars;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pawvet-glass-card"
      style={{ padding: "1.25rem" }}
    >
      <h2 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
        Rate your consultation
      </h2>
      <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-muted)" }}>
        How was your experience with <strong>{vetName}</strong>?
      </p>

      {step === 1 ? (
        <>
          <div
            role="slider"
            aria-valuenow={active}
            aria-valuemin={1}
            aria-valuemax={5}
            aria-label="Star rating"
            style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStars(s)}
                onMouseEnter={() => setHover(s)}
                style={{
                  padding: 4,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: s <= active ? "#f59e0b" : "var(--color-border)",
                }}
                aria-label={`${s} star${s > 1 ? "s" : ""}`}
              >
                <Star size={32} fill={s <= active ? "currentColor" : "none"} strokeWidth={1.6} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ph-btn ph-btn-primary"
            disabled={stars < 1}
            onClick={() => setStep(2)}
          >
            Next: optional comment
          </button>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", color: "var(--color-muted)" }}>
            You chose <strong>{stars}★</strong>. Add a public comment for other guardians (optional), then submit.
          </p>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.88rem" }}>
            Comment (optional)
          </label>
          <textarea
            className="ph-textarea"
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What went well? What could improve?"
            style={{ width: "100%", marginBottom: "1rem" }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button type="button" className="ph-btn ph-btn-ghost" disabled={submitting} onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="ph-btn ph-btn-primary"
              disabled={submitting}
              onClick={() => void onSubmit(stars, feedback.trim())}
            >
              {submitting ? "Submitting…" : "Submit rating and comment"}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
