import clsx from "clsx";

type Props = { children: React.ReactNode; variant?: "neutral" | "salmon" | "sage" };

export function Badge({ children, variant = "neutral" }: Props) {
  return (
    <span
      className={clsx("hub-atom-badge", {
        "hub-atom-badge--salmon": variant === "salmon",
        "hub-atom-badge--sage": variant === "sage",
      })}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.15rem 0.45rem",
        borderRadius: 6,
        fontSize: "0.72rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        background: variant === "salmon" ? "var(--hub-salmon-soft)" : variant === "sage" ? "var(--hub-sage-soft)" : "#f0ebe4",
        color: variant === "salmon" ? "#6b3d32" : "var(--color-primary-dark)",
      }}
    >
      {children}
    </span>
  );
}
