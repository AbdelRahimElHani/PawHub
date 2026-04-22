import { motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import { RatingSystem } from "../shared/RatingSystem";
import { useVetStore } from "../store/useVetStore";
import type { PawVetConsultationReviewDto } from "../types/pawvetConsultationReview";
import "../pawvet/pawvet.css";
import { useMemo, useState } from "react";

export function RatingScreen() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const cases = useVetStore((s) => s.cases);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  async function onSubmit(stars: number, feedback: string) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api<PawVetConsultationReviewDto>("/api/pawvet/consultation-reviews", {
        method: "POST",
        body: JSON.stringify({
          externalCaseId: caseRow.id,
          vetUserId: caseRow.vetUserId,
          stars,
          comment: feedback || null,
        }),
      });
      nav("/pawvet", { replace: true });
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Could not save your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pawvet-shell">
      <motion.div className="pawvet-hero" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.35rem", color: "var(--color-primary-dark)" }}>Thanks for using PawVet</h1>
        <p style={{ margin: 0 }}>Your feedback helps other guardians choose trusted care.</p>
      </motion.div>
      {submitError ? (
        <p className="pawvet-glass-card" style={{ padding: "0.85rem", marginBottom: "1rem", border: "1px solid #fecaca", background: "#fef2f2", color: "#b42318" }} role="alert">
          {submitError}
        </p>
      ) : null}
      <RatingSystem vetName={caseRow.vetName ?? "Your vet"} onSubmit={onSubmit} submitting={submitting} />
      <p style={{ marginTop: "1rem", textAlign: "center" }}>
        <Link className="ph-btn ph-btn-ghost" to="/pawvet">
          Skip for now
        </Link>
      </p>
    </div>
  );
}
