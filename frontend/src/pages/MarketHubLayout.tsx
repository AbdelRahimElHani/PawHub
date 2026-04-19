import { Link, NavLink, Outlet } from "react-router-dom";
import { useThreadNotifications } from "../notifications/ThreadNotificationContext";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  "pm-hub-tab" + (isActive ? " pm-hub-tab--active" : "");

export function MarketHubLayout() {
  const { listingUnreadCount } = useThreadNotifications();

  return (
    <div style={{ padding: "0.5rem 0 1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "1.75rem",
              color: "var(--color-primary-dark)",
            }}
          >
            Paw Market
          </h1>
          <p style={{ margin: "0.2rem 0 0", color: "var(--color-muted)", fontSize: "0.9rem" }}>
            Shop community listings, or manage your own items in a separate tab.
          </p>
        </div>
        <Link className="ph-btn ph-btn-accent" to="/market/new">
          + List an item
        </Link>
      </div>

      <nav className="pm-hub-tabs" aria-label="Paw Market sections">
        <NavLink to="/market" end className={tabClass}>
          Shop
        </NavLink>
        <NavLink to="/market/selling" className={tabClass}>
          My listings
          {listingUnreadCount > 0 ? (
            <span className="pm-hub-tab-badge" title="Unread buyer messages about your items">
              {listingUnreadCount > 9 ? "9+" : listingUnreadCount}
            </span>
          ) : null}
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}
