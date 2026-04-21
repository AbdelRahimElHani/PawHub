import { LogOut, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { userInitials } from "./userDisplay";

export function HeaderUserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onLogout = useCallback(() => {
    setOpen(false);
    logout();
  }, [logout]);

  if (!user) return null;

  return (
    <div className="ph-header-user" ref={rootRef}>
      <button
        type="button"
        className="ph-header-user-trigger ph-header-user-trigger--icon-only"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={user.displayName ? `Account menu, ${user.displayName}` : "Account menu"}
        onClick={() => setOpen((o) => !o)}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="ph-header-user-avatar" width={40} height={40} />
        ) : (
          <span className="ph-header-user-avatar ph-header-user-avatar--placeholder" aria-hidden>
            {user.displayName ? (
              <span className="ph-header-user-initials">{userInitials(user.displayName)}</span>
            ) : (
              <UserRound size={20} strokeWidth={2} />
            )}
          </span>
        )}
      </button>
      {open ? (
        <div className="ph-header-user-menu" role="menu">
          <Link className="ph-header-user-item" role="menuitem" to="/account" onClick={() => setOpen(false)}>
            <UserRound size={18} strokeWidth={2} />
            Profile
          </Link>
          <button type="button" className="ph-header-user-item ph-header-user-item--danger" role="menuitem" onClick={onLogout}>
            <LogOut size={18} strokeWidth={2} />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
