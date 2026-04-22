import { Link, Navigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../auth/AuthContext";

export function GuestLanding() {
  return (
    <div className="ph-landing">
      <div className="ph-landing-orbs" aria-hidden />
      <div className="ph-surface ph-landing-card">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <BrandLogo variant="hero" />
        </div>
        <h1>Welcome to PawHub</h1>
        <p style={{ color: "var(--color-muted)", maxWidth: 440, margin: "0.35rem auto 1.5rem", lineHeight: 1.6 }}>
          Match cats, trade on PawMarket, find adoptions, and chat — whether you are adopting, rehoming, or running a
          shelter.
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

const DASH_TILES: { to: string; emoji: string; title: string; desc: string; shelterOnly?: boolean }[] = [
  { to: "/pawmatch", emoji: "💞", title: "PawMatch", desc: "Swipe and match with cats." },
  { to: "/matches", emoji: "✨", title: "Matches", desc: "People who liked your cats." },
  { to: "/messages", emoji: "💬", title: "Messages", desc: "Chats and threads." },
  { to: "/market", emoji: "🛒", title: "PawMarket", desc: "Listings and supplies." },
  { to: "/hub", emoji: "📚", title: "Learn", desc: "FAQ, editorial, and community." },
  { to: "/adopt", emoji: "🏠", title: "PawAdopt", desc: "Browse adoption listings." },
  { to: "/cats", emoji: "🐈", title: "My cats", desc: "Profiles and photos for your cats." },
  { to: "/adopt/shelter", emoji: "🏛️", title: "Shelter profile", desc: "Status and organization details.", shelterOnly: true },
  { to: "/account", emoji: "⚙️", title: "Account", desc: "Photo, bio, and display name." },
];

export function Home() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="ph-loading-full" role="status" aria-live="polite">
        <div className="ph-loading-paws" aria-hidden>
          🐾
        </div>
        <p style={{ margin: 0 }}>Loading your den…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const intro = TYPE_INTRO[user.accountType] ?? "Pick a paw-shaped journey below.";

  return (
    <div className="ph-dash-shell">
      <div className="ph-surface ph-dash-hero">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="ph-avatar-preview" style={{ width: 76, height: 76, objectFit: "cover" }} />
        ) : (
          <div
            className="ph-avatar-preview"
            style={{
              width: 76,
              height: 76,
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
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Hi, {user.displayName}</h2>
          <p style={{ color: "var(--color-muted)", margin: 0, lineHeight: 1.55 }}>{intro}</p>
          {(user.profileCity || user.profileRegion) && (
            <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
              📍 {[user.profileCity, user.profileRegion].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="ph-dash-grid">
        {DASH_TILES.filter((t) => !t.shelterOnly || user.accountType === "SHELTER").map((t) => (
          <Link key={t.to} className="ph-surface ph-dash-tile" to={t.to}>
            <span className="ph-dash-tile-emoji" aria-hidden>
              {t.emoji}
            </span>
            <div>
              <strong>{t.title}</strong>
              <div className="ph-dash-tile-desc">{t.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
