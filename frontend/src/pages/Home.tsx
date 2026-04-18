import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function GuestLanding() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <div className="ph-surface" style={{ padding: "2.25rem", textAlign: "center" }}>
        <h1 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Welcome to PawHub</h1>
        <p style={{ color: "var(--color-muted)", maxWidth: 420, margin: "0 auto 1.5rem" }}>
          Match cats, trade on PawMarket, find adoptions, and chat — whether you are adopting, rehoming, or running a shelter.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="ph-btn ph-btn-primary" to="/login">
            Log in
          </Link>
          <Link className="ph-btn ph-btn-accent" to="/register">
            Create account
          </Link>
        </div>
        <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginTop: "1.5rem", marginBottom: 0 }}>
          Choose adopter, cat owner, or shelter when you sign up — each path collects the details we need.
        </p>
      </div>
    </div>
  );
}

const TYPE_INTRO: Record<string, string> = {
  ADOPTER: "Explore matches, browse adoptions, and save your profile.",
  CAT_OWNER: "List your cats on PawMatch and PawMarket from My cats.",
  SHELTER: "Your shelter application is tied to your account — manage it under PawAdopt.",
};

export function Home() {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;

  const intro = TYPE_INTRO[user.accountType] ?? "Pick a paw-shaped journey below.";

  return (
    <div className="ph-surface" style={{ padding: "1.75rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="ph-avatar-preview" style={{ width: 72, height: 72, objectFit: "cover" }} />
        ) : (
          <div
            className="ph-avatar-preview"
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              color: "var(--color-muted)",
            }}
          >
            no photo
          </div>
        )}
        <div>
          <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Hi, {user.displayName}</h2>
          <p style={{ color: "var(--color-muted)", margin: 0 }}>{intro}</p>
          {(user.profileCity || user.profileRegion) && (
            <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
              {[user.profileCity, user.profileRegion].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="ph-grid ph-grid-2" style={{ marginTop: "1.25rem" }}>
        <Link className="ph-surface" to="/pawmatch" style={{ padding: "1rem", display: "block" }}>
          <strong>PawMatch</strong>
          <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>Swipe and match with cats.</div>
        </Link>
        <Link className="ph-surface" to="/market" style={{ padding: "1rem", display: "block" }}>
          <strong>PawMarket</strong>
          <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>Listings and supplies.</div>
        </Link>
        <Link className="ph-surface" to="/adopt" style={{ padding: "1rem", display: "block" }}>
          <strong>PawAdopt</strong>
          <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>Browse adoption listings.</div>
        </Link>
        <Link className="ph-surface" to="/cats" style={{ padding: "1rem", display: "block" }}>
          <strong>My cats</strong>
          <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>Profiles and photos for your cats.</div>
        </Link>
        {user.accountType === "SHELTER" && (
          <Link className="ph-surface" to="/adopt/shelter" style={{ padding: "1rem", display: "block" }}>
            <strong>Shelter profile</strong>
            <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>Status and organization details.</div>
          </Link>
        )}
        <Link className="ph-surface" to="/account" style={{ padding: "1rem", display: "block" }}>
          <strong>Account</strong>
          <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>Photo, bio, and display name.</div>
        </Link>
      </div>
    </div>
  );
}
