import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
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
  const { user, logout } = useAuth();
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
      <header
        className="ph-surface"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
        }}
      >
        <Link to="/" className="brand" style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-primary-dark)" }}>
          PawHub
        </Link>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
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
          <NavLink to="/adopt" style={linkStyle}>
            PawAdopt
          </NavLink>
          <NavLink to="/account" style={linkStyle}>
            Account
          </NavLink>
          {user?.role === "ADMIN" && (
            <NavLink to="/admin" style={linkStyle}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="ph-user-chip" style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="ph-user-avatar-sm" />
          ) : (
            <div className="ph-user-avatar-sm" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem" }}>
              you
            </div>
          )}
          <span>{user?.displayName}</span>
          <button type="button" className="ph-btn ph-btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      {children !== undefined ? children : <Outlet />}
      {user ? <MessagingDock /> : null}
    </div>
  );
}
