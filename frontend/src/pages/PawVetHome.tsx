import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import "../pawvet/pawvet.css";

export function PawVetHome() {
  const { user } = useAuth();
  return (
    <div className="pawvet-shell">
      <motion.div className="pawvet-hero" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1>
          <HeartPulse size={28} style={{ verticalAlign: "middle", marginRight: "0.35rem", color: "var(--pawvet-medical)" }} aria-hidden />
          PawVet
        </h1>
        <p>
          Medical triage and consultation between pet guardians and licensed veterinarians. File a case, get matched with
          a verified vet, and chat in a private room — with admin oversight on credentials.
        </p>
      </motion.div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <motion.div
          className="pawvet-glass-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ padding: "1.25rem" }}
        >
          <Stethoscope size={22} color="var(--pawvet-medical)" aria-hidden />
          <h2 style={{ margin: "0.5rem 0 0.35rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
            I need help
          </h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
            Describe symptoms and attach photos. A verified vet can claim your case.
          </p>
          <Link className="ph-btn ph-btn-primary" to="/pawvet/file-case">
            File a case
          </Link>
        </motion.div>

        <motion.div
          className="pawvet-glass-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ padding: "1.25rem" }}
        >
          <ShieldCheck size={22} color="var(--pawvet-medical)" aria-hidden />
          <h2 style={{ margin: "0.5rem 0 0.35rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
            I am a veterinarian
          </h2>
          <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
            Review the open triage board, claim cases, and manage your professional profile.
          </p>
          <Link className="ph-btn ph-btn-accent" to="/vet">
            Vet dashboard
          </Link>
        </motion.div>

        {user?.role === "ADMIN" && (
          <motion.div
            className="pawvet-glass-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ padding: "1.25rem" }}
          >
            <h2 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
              Admin
            </h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
              Verify DVM credentials and license submissions before vets can claim live cases.
            </p>
            <Link className="ph-btn ph-btn-ghost" to="/admin/vet-verification">
              Vet verification queue
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
