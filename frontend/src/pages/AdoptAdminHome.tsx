import { HeartPulse, Shield, ShieldCheck, Star } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Central hub for shelter + veterinarian account approvals (moved from generic dashboard / PawVet admin landing).
 */
export function AdoptAdminHome() {
  return (
    <div className="ph-surface" style={{ padding: "clamp(1rem, 2vw, 1.75rem)", borderRadius: 20, maxWidth: 900 }}>
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>PawAdopt — administration</h1>
      <p style={{ color: "var(--color-muted)", lineHeight: 1.55, marginBottom: "1.5rem" }}>
        Review shelter organizations and veterinarian licenses. Live PawVet triage for guardians stays under{" "}
        <Link to="/pawvet" style={{ fontWeight: 600 }}>
          PawVet
        </Link>
        .
      </p>
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <Link
          to="/adopt/admin/shelters"
          className="ph-surface"
          style={{ padding: "1.15rem", textDecoration: "none", color: "inherit", border: "1px solid var(--color-border)" }}
        >
          <Shield size={22} aria-hidden style={{ color: "var(--color-primary)" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", margin: "0.5rem 0 0.35rem" }}>Shelter applications</h2>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-muted)", lineHeight: 1.45 }}>
            Pending, appeals, verified, and rejected shelter profiles.
          </p>
        </Link>
        <Link
          to="/adopt/admin/vet-verification"
          className="ph-surface"
          style={{ padding: "1.15rem", textDecoration: "none", color: "inherit", border: "1px solid var(--color-border)" }}
        >
          <ShieldCheck size={22} aria-hidden style={{ color: "var(--color-primary)" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", margin: "0.5rem 0 0.35rem" }}>Vet license queue</h2>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-muted)", lineHeight: 1.45 }}>
            Applications, appeals, and credential decisions before vets claim cases.
          </p>
        </Link>
        <Link
          to="/adopt/admin/vet-reviews"
          className="ph-surface"
          style={{ padding: "1.15rem", textDecoration: "none", color: "inherit", border: "1px solid var(--color-border)" }}
        >
          <Star size={22} aria-hidden style={{ color: "var(--color-primary)" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", margin: "0.5rem 0 0.35rem" }}>Vet reviews</h2>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-muted)", lineHeight: 1.45 }}>
            Ratings and feedback on verified veterinarians; revoke access when needed.
          </p>
        </Link>
        <Link
          to="/adopt/admin/pawvet-reports"
          className="ph-surface"
          style={{ padding: "1.15rem", textDecoration: "none", color: "inherit", border: "1px solid var(--color-border)" }}
        >
          <HeartPulse size={22} aria-hidden style={{ color: "var(--pawvet-medical, #0d6efd)" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", margin: "0.5rem 0 0.35rem" }}>Guardian reports</h2>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-muted)", lineHeight: 1.45 }}>
            Reports filed from PawVet consultations about specific veterinarians.
          </p>
        </Link>
      </div>
      <p style={{ marginTop: "1.5rem" }}>
        <Link className="ph-btn ph-btn-ghost" to="/adopt">
          ← PawAdopt home
        </Link>
      </p>
    </div>
  );
}
