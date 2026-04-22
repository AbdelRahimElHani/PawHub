import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
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
    <div className={`ph-layout-wrap${user ? " ph-layout-wrap--dock" : ""}`}>
      <header
        className="ph-surface ph-app-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
        }}
      >
        <Link
          to="/"
          className="brand ph-shell-brand"
          aria-label="PawHub home"
          style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
        >
          <BrandLogo variant="nav" />
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
          {user?.role === "ADMIN" && (
            <NavLink to="/admin" style={linkStyle}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="ph-user-chip">
          <NavLink
            to="/account"
            className={({ isActive }) => "ph-user-chip-account" + (isActive ? " ph-user-chip-account--active" : "")}
            title="My account"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="ph-user-avatar-sm" />
            ) : (
              <div
                className="ph-user-avatar-sm"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem" }}
              >
                you
              </div>
            )}
            <span className="ph-user-chip-name">{user?.displayName ?? "Account"}</span>
          </NavLink>
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
