import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Platform admins manage the app — they do not use the end-user "My cats" area. */
export function RequireNonAdminMyCats({ children }: { children: ReactElement }) {
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
    return <Navigate to="/" replace />;
  }
  return children;
}
