import { useNavigate } from "react-router-dom";
import { userInitials } from "../../shell/userDisplay";

export type UserChipProps = {
  userId: number;
  displayName: string;
  avatarUrl?: string | null;
  /** If false, still navigates but looks muted (e.g. system). */
  interactive?: boolean;
  size?: "sm" | "md";
};

/**
 * Clickable row: avatar + display name → public profile `/users/:id`.
 */
export function UserChip({
  userId,
  displayName,
  avatarUrl,
  interactive = true,
  size = "md",
}: UserChipProps) {
  const navigate = useNavigate();
  const dim = size === "sm" ? 28 : 36;
  const fontSize = size === "sm" ? "0.82rem" : "0.9rem";

  return (
    <button
      type="button"
      className="ph-user-chip"
      disabled={!interactive}
      onClick={() => {
        if (!interactive) return;
        navigate(`/users/${userId}`);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: 0,
        margin: 0,
        border: "none",
        background: "transparent",
        cursor: interactive ? "pointer" : "default",
        textAlign: "left",
        maxWidth: "100%",
      }}
      title={interactive ? `View ${displayName}'s profile` : undefined}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          width={dim}
          height={dim}
          style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <span
          style={{
            width: dim,
            height: dim,
            borderRadius: "50%",
            background: "#eef6f4",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size === "sm" ? "0.65rem" : "0.72rem",
            fontWeight: 700,
            color: "var(--color-primary-dark)",
            flexShrink: 0,
          }}
        >
          {userInitials(displayName)}
        </span>
      )}
      <strong
        style={{
          fontSize,
          fontWeight: 700,
          color: interactive ? "var(--color-primary-dark)" : "var(--color-text)",
          textDecoration: interactive ? "underline" : "none",
          textDecorationColor: "color-mix(in srgb, var(--color-primary) 35%, transparent)",
          textUnderlineOffset: "0.12em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {displayName}
      </strong>
    </button>
  );
}
