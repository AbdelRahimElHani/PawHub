import clsx from "clsx";
import { BookOpen, Cat, LayoutGrid, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { SavedArticlesProvider } from "./context/SavedArticlesContext";
import "./hub.css";
import { CommandPalette } from "./components/molecules/CommandPalette";

const nav = [
  { to: "/hub", label: "Overview", icon: LayoutGrid, end: true, kind: "normal" as const },
  { to: "/hub/faq", label: "FAQ", icon: Cat, kind: "normal" as const },
  { to: "/hub/editorial", label: "Editorial", icon: BookOpen, kind: "normal" as const },
  { to: "/hub/community/general", label: "Community", icon: MessageSquare, kind: "community" as const },
];

export function HubLayout() {
  const location = useLocation();
  const communityActive = location.pathname.startsWith("/hub/community");

  return (
    <SavedArticlesProvider>
      <div className="hub-root">
        <div className="hub-shell">
          <aside className="hub-sidebar" aria-label="Learn navigation">
            <div className="hub-sidebar-brand">PawHub Learn</div>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--color-muted)", lineHeight: 1.4 }}>
              Guides, stories, and community — curated for thoughtful cat people.
            </p>
            {nav.map(({ to, label, icon: Icon, end, kind }) =>
              kind === "community" ? (
                <Link
                  key={to}
                  to={to}
                  className="hub-nav-link"
                  data-active={communityActive ? "true" : "false"}
                  style={{
                    background: communityActive ? "var(--color-accent-soft)" : undefined,
                    color: communityActive ? "#3a2f12" : undefined,
                  }}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </Link>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  end={!!end}
                  className={({ isActive }) => clsx("hub-nav-link", isActive && "hub-nav-link--active")}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </NavLink>
              ),
            )}
          </aside>

          <div className="hub-main-panel">
            <div className="hub-toolbar">
              <div />
              <CommandPalette />
            </div>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </div>
        </div>

        <nav className="hub-bottom-nav" aria-label="Learn mobile navigation">
          {nav.map(({ to, label, icon: Icon, end, kind }) => {
            const active =
              kind === "community"
                ? communityActive
                : end
                  ? location.pathname === to
                  : location.pathname.startsWith(to);
            const inner = (
              <>
                <Icon size={22} aria-hidden />
                <span>{label.split(" ")[0]}</span>
              </>
            );
            return kind === "community" ? (
              <Link key={to} to={to} className={clsx("hub-bottom-link", active && "hub-bottom-link--active")}>
                {inner}
              </Link>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={!!end}
                className={({ isActive }) => clsx("hub-bottom-link", isActive && "hub-bottom-link--active")}
              >
                {inner}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </SavedArticlesProvider>
  );
}
