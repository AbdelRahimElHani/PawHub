import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Admins moderate Paw Market; they do not use seller / buyer flows here. */
export function RequireNonAdminMarket({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="ph-loading-full" role="status" aria-live="polite">
        <div className="ph-loading-paws" aria-hidden>
          🐾
        </div>
        <p style={{ margin: 0 }}>Loading…</p>
      </div>
    );
  }
  if (user?.role === "ADMIN") {
    return <Navigate to="/market" replace />;
  }
  return children;
}
