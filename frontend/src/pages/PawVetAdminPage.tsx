import { motion } from "framer-motion";
import { Building2, HeartPulse, ShieldCheck, Star } from "lucide-react";
import { Link } from "react-router-dom";
import "../pawvet/pawvet.css";

export function PawVetAdminPage() {
  return (
    <div className="pawvet-shell">
      <motion.div className="pawvet-hero" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1>
          <HeartPulse size={28} style={{ verticalAlign: "middle", marginRight: "0.35rem", color: "var(--pawvet-medical)" }} aria-hidden />
          PawVet administration
        </h1>
        <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.55, maxWidth: "60ch" }}>
          Oversee veterinarian credentialing and related programs. Guardian triage and the vet dashboard are hidden here on
          purpose — use the tools below.
        </p>
      </motion.div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <motion.div
          className="pawvet-glass-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          style={{ padding: "1.25rem" }}
        >
          <Star size={24} color="var(--pawvet-medical)" aria-hidden />
          <h2 style={{ margin: "0.5rem 0 0.35rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
            Vet reviews and comments
          </h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
            Browse every veterinarian account with star ratings and written feedback guardians left after consultations.
          </p>
          <Link className="ph-btn ph-btn-primary" to="/admin/vet-reviews">
            Open vet reviews
          </Link>
        </motion.div>
        <motion.div
          className="pawvet-glass-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ padding: "1.25rem" }}
        >
          <ShieldCheck size={24} color="var(--pawvet-medical)" aria-hidden />
          <h2 style={{ margin: "0.5rem 0 0.35rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
            Veterinarian credentialing
          </h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
            Review full license applications, uploaded documents, and approve or reject before vets can claim live triage
            cases.
          </p>
          <Link className="ph-btn ph-btn-primary" to="/admin/vet-verification">
            Open vet verification queue
          </Link>
        </motion.div>

        <motion.div
          className="pawvet-glass-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ padding: "1.25rem" }}
        >
          <Building2 size={24} color="var(--pawvet-medical)" aria-hidden />
          <h2 style={{ margin: "0.5rem 0 0.35rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
            Shelter applications
          </h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
            Review organizations applying to list adoptable pets on PawAdopt.
          </p>
          <Link className="ph-btn ph-btn-accent" to="/admin/shelters">
            Open shelter admin
          </Link>
        </motion.div>
      </div>

      <p style={{ marginTop: "1.5rem" }}>
        <Link className="ph-btn ph-btn-ghost" to="/">
          ← Home
        </Link>
      </p>
    </div>
  );
}
