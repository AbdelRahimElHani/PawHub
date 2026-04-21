import type { ReactNode } from "react";
import { Heart } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAdoptStore } from "../adopt/useAdoptStore";
import { useAuth } from "../auth/AuthContext";
import { ChatWidget } from "../components/chat/ChatWidget";
import { HeaderUserMenu } from "./HeaderUserMenu";
import { MessagingDock } from "../messenger/MessagingDock";
import { useThreadNotifications } from "../notifications/ThreadNotificationContext";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: "0.35rem 0.75rem",
  borderRadius: 999,
  fontWeight: 600,
  fontFamily: "var(--font-display)",
  background: isActive ? "var(--color-accent-soft)" : "transparent",
  color: isActive ? "#3a2f12" : "var(--color-primary-dark)",
});

function AdoptLoveCounter() {
  const n = useAdoptStore((s) => s.favorites.length);
  return (
    <Link
      to="/adopt#love-list"
      title="Love List — saved cats"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.2rem 0.5rem",
        borderRadius: 999,
        fontSize: "0.78rem",
        fontWeight: 700,
        textDecoration: "none",
        color: n > 0 ? "#9a1f2e" : "var(--color-muted)",
        background: n > 0 ? "color-mix(in srgb, #ffd6dc 55%, transparent)" : "transparent",
      }}
    >
      <Heart size={15} fill={n > 0 ? "currentColor" : "none"} aria-hidden />
      <span>{n}</span>
    </Link>
  );
}

function PawMarketNavLink() {
  const { listingUnreadCount } = useThreadNotifications();
  return (
    <NavLink
      to="/market"
      style={(args) => ({
        ...linkStyle(args),
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
      })}
    >
      <span>PawMarket</span>
      {listingUnreadCount > 0 ? (
        <span className="ph-nav-badge" title="Unread messages about your Paw Market listings">
          {listingUnreadCount > 9 ? "9+" : listingUnreadCount}
        </span>
      ) : null}
    </NavLink>
  );
}

export function Layout({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        paddingTop: "1rem",
        paddingLeft: "1.25rem",
        paddingRight: "1.25rem",
        paddingBottom: user ? "4.5rem" : "2rem",
      }}
    >
      <div className="ph-top-bar">
        <header
          className="ph-surface ph-app-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "0.65rem 1rem",
            flexWrap: "wrap",
            flex: 1,
            minWidth: 0,
          }}
        >
        <Link to="/" className="brand" style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-primary-dark)", flexShrink: 0 }}>
          PawHub
        </Link>
        <nav className="ph-app-nav" style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center", justifyContent: "flex-end", flex: 1 }}>
          <NavLink to="/cats" style={linkStyle}>
            My cats
          </NavLink>
          <NavLink to="/pawmatch" style={linkStyle}>
            PawMatch
          </NavLink>
          <NavLink to="/matches" style={linkStyle}>
            Matches
          </NavLink>
          <PawMarketNavLink />
          <NavLink to="/hub" style={linkStyle}>
            Learn
          </NavLink>
          <NavLink to="/pawvet" style={linkStyle}>
            PawVet
          </NavLink>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.15rem" }}>
            <NavLink to="/adopt" style={linkStyle}>
              PawAdopt
            </NavLink>
            <AdoptLoveCounter />
          </span>
          {user?.role === "ADMIN" && (
            <NavLink to="/admin" style={linkStyle}>
              Admin
            </NavLink>
          )}
        </nav>
        </header>
        {user ? <HeaderUserMenu /> : null}
      </div>
      {children !== undefined ? children : <Outlet />}
      {user ? <MessagingDock /> : null}
      {user ? <ChatWidget /> : null}
    </div>
  );
}
