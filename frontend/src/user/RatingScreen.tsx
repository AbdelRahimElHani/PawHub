import { motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { RatingSystem } from "../shared/RatingSystem";
import { useVetStore } from "../store/useVetStore";
import "../pawvet/pawvet.css";
import { useMemo, useState } from "react";

export function RatingScreen() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const cases = useVetStore((s) => s.cases);
  const addReview = useVetStore((s) => s.addReview);
  const [submitting, setSubmitting] = useState(false);

  const c = useMemo(() => (caseId ? cases.find((x) => x.id === caseId) : undefined), [cases, caseId]);

  if (!caseId) {
    return <p className="pawvet-shell">Invalid case.</p>;
  }

  if (!c) {
    return (
      <div className="pawvet-shell">
        <p style={{ color: "var(--color-muted)" }}>Case not found.</p>
        <Link className="ph-btn ph-btn-primary" to="/pawvet">
          Back to PawVet
        </Link>
      </div>
    );
  }

  if (!user || user.userId !== c.ownerUserId) {
    return (
      <div className="pawvet-shell">
        <p style={{ color: "var(--color-muted)" }}>Only the pet guardian can rate this consultation.</p>
        <Link className="ph-btn ph-btn-primary" to="/pawvet">
          PawVet home
        </Link>
      </div>
    );
  }

  if (c.status !== "RESOLVED" || !c.vetUserId || !c.vetName) {
    return (
      <div className="pawvet-shell">
        <p style={{ color: "var(--color-muted)" }}>This case is not ready for rating yet.</p>
        <Link className="ph-btn ph-btn-primary" to={`/pawvet/case/${caseId}`}>
          Back to consultation
        </Link>
      </div>
    );
  }

  const caseRow = c;
  const owner = user;

  async function onSubmit(stars: number, feedback: string) {
    setSubmitting(true);
    addReview({
      caseId: caseRow.id,
      vetUserId: caseRow.vetUserId!,
      ownerUserId: owner.userId,
      stars,
      feedback,
    });
    await new Promise((r) => setTimeout(r, 200));
    setSubmitting(false);
    nav("/pawvet", { replace: true });
  }

  return (
    <div className="pawvet-shell">
      <motion.div className="pawvet-hero" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.35rem", color: "var(--color-primary-dark)" }}>Thanks for using PawVet</h1>
        <p style={{ margin: 0 }}>Your feedback helps other guardians choose trusted care.</p>
      </motion.div>
      <RatingSystem vetName={caseRow.vetName ?? "Your vet"} onSubmit={onSubmit} submitting={submitting} />
      <p style={{ marginTop: "1rem", textAlign: "center" }}>
        <Link className="ph-btn ph-btn-ghost" to="/pawvet">
          Skip for now
        </Link>
      </p>
    </div>
  );
}
