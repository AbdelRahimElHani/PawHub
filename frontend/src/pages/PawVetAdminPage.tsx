import { Navigate } from "react-router-dom";

/** @deprecated Admin approvals live under PawAdopt — kept route for bookmarks. */
export function PawVetAdminPage() {
  return <Navigate to="/pawvet/admin/vet-verification" replace />;
}
