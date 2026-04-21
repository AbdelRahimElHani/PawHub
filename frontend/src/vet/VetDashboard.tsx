import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, Star, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { canWorkAsVerifiedVet } from "../auth/vetAccess";
import { useVetStore } from "../store/useVetStore";
import { CaseClosePanel } from "./CaseResolution";
import "../pawvet/pawvet.css";

function urgencyLabel(u: string) {
  if (u === "urgent") return "Urgent";
  if (u === "soon") return "Soon";
  return "Routine";
}

export function VetDashboard() {
  const { user, refreshMe } = useAuth();
  const cases = useVetStore((s) => s.cases);
  const claimCase = useVetStore((s) => s.claimCase);
  const getVetRating = useVetStore((s) => s.getVetRating);
  const reviews = useVetStore((s) => s.reviews);

  const [resolveId, setResolveId] = useState<string | null>(null);

  const verified = canWorkAsVerifiedVet(user);
  const openCases = useMemo(() => cases.filter((c) => c.status === "OPEN"), [cases]);
  const myCases = useMemo(
    () => cases.filter((c) => user && c.vetUserId === user.userId && c.status === "IN_PROGRESS"),
    [cases, user],
  );
  const rating = user ? getVetRating(user.userId) : { average: 0, count: 0 };
  const myReviews = useMemo(() => (user ? reviews.filter((r) => r.vetUserId === user.userId) : []), [reviews, user]);

  function claim(caseId: string) {
    if (!user || !verified) return;
    claimCase({
      caseId,
      vetUserId: user.userId,
      vetName: user.displayName.startsWith("Dr.") ? user.displayName : `Dr. ${user.displayName}`,
      vetAvatarUrl: user.avatarUrl,
    });
  }

  if (!user) {
    return null;
  }

  if (user.accountType !== "VET") {
    return (
      <div className="pawvet-shell">
        <div className="pawvet-hero" style={{ marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "1.45rem", color: "var(--color-primary-dark)" }}>Vet dashboard</h1>
          <p>PawVet triage is only available to accounts registered as veterinarians.</p>
        </div>
        <Link className="ph-btn ph-btn-primary" to="/register">
          Register as a veterinarian
        </Link>
        <p style={{ marginTop: "1rem" }}>
          <Link className="ph-btn ph-btn-ghost" to="/pawvet">
            ← PawVet home
          </Link>
        </p>
      </div>
    );
  }

  const vetStatus = user.vetVerificationStatus;
  const pending = vetStatus === "PENDING";
  const rejected = vetStatus === "REJECTED";

  return (
    <div className="pawvet-shell">
      <div className="pawvet-hero" style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.45rem", color: "var(--color-primary-dark)" }}>Vet dashboard</h1>
        <p>Open triage, claim cases you can help with, and keep your professional profile current.</p>
      </div>

      {pending ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="pawvet-glass-card"
          style={{ padding: "1rem", marginBottom: "1rem", border: "1px dashed var(--pawvet-medical)" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
            <UserCheck size={22} color="var(--pawvet-medical)" aria-hidden />
            <div style={{ flex: 1, minWidth: 200 }}>
              <strong style={{ color: "var(--color-primary-dark)" }}>Application under review</strong>
              <p style={{ margin: "0.35rem 0 0.75rem", fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
                Our credentialing team is reviewing the documents you uploaded. Please watch <strong>{user.email}</strong> —
                we use that address to schedule a short <strong>verification interview</strong> (video or phone) and to send
                decisions. You can claim triage cases only after your status shows <strong>Approved</strong>. Use
                &quot;Refresh status&quot; below after you hear from us.
              </p>
              <button type="button" className="ph-btn ph-btn-ghost" onClick={() => void refreshMe()}>
                Refresh status
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}

      {rejected ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="pawvet-glass-card"
          style={{ padding: "1rem", marginBottom: "1rem", border: "1px solid #fecaca", background: "#fef2f2" }}
        >
          <strong style={{ color: "#b42318" }}>Application not approved</strong>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem", color: "var(--color-muted)" }}>
            {user.vetRejectionReason
              ? user.vetRejectionReason
              : "Please contact support if you believe this was a mistake."}
          </p>
        </motion.div>
      ) : null}

      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", color: "var(--color-primary-dark)", display: "flex", alignItems: "center", gap: 8, marginBottom: "0.75rem" }}>
          <ClipboardList size={20} aria-hidden />
          Open triage
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <AnimatePresence>
            {openCases.length === 0 ? (
              <p className="pawvet-glass-card" style={{ padding: "1rem", color: "var(--color-muted)", margin: 0 }}>
                No unassigned cases right now.
              </p>
            ) : (
              openCases.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pawvet-glass-card"
                  style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, color: "var(--color-primary-dark)" }}>{c.catName}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginTop: 4 }}>
                      {c.symptoms.slice(0, 120)}
                      {c.symptoms.length > 120 ? "…" : ""}
                    </div>
                  </div>
                  <span className={`pawvet-urgent pawvet-urgent--${c.urgency}`}>{urgencyLabel(c.urgency)}</span>
                  <button
                    type="button"
                    className="ph-btn ph-btn-primary"
                    disabled={!verified}
                    onClick={() => claim(c.id)}
                    title={!verified ? "Wait for admin approval of your veterinarian account" : undefined}
                  >
                    Claim case
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", color: "var(--color-primary-dark)", marginBottom: "0.75rem" }}>My active cases</h2>
        {myCases.length === 0 ? (
          <p className="pawvet-glass-card" style={{ padding: "1rem", color: "var(--color-muted)", margin: 0 }}>
            Claim a case from the board to see it here.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {myCases.map((c) => (
              <div key={c.id} className="pawvet-glass-card" style={{ padding: "1rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: resolveId === c.id ? "0.75rem" : 0 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong style={{ color: "var(--color-primary-dark)" }}>{c.catName}</strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>Case ID: {c.id}</div>
                  </div>
                  <Link className="ph-btn ph-btn-accent" to={`/pawvet/case/${c.id}`}>
                    Open chat
                  </Link>
                  {resolveId === c.id ? (
                    <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setResolveId(null)}>
                      Cancel close
                    </button>
                  ) : (
                    <button type="button" className="ph-btn ph-btn-primary" onClick={() => setResolveId(c.id)}>
                      Close case
                    </button>
                  )}
                </div>
                {resolveId === c.id ? <CaseClosePanel caseId={c.id} onClosed={() => setResolveId(null)} /> : null}
              </div>
            ))}
          </div>
        )}
      </motion.section>

      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="pawvet-glass-card" style={{ padding: "1.15rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", color: "var(--color-primary-dark)", margin: "0 0 0.75rem", display: "flex", alignItems: "center", gap: 8 }}>
          <Star size={20} aria-hidden style={{ color: "#f59e0b" }} />
          Professional profile
        </h2>
        <p style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>
          <strong style={{ color: "var(--color-primary-dark)" }}>{rating.average ? rating.average.toFixed(1) : "—"}</strong>
          <span style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}> / 5 average</span>
          <span style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginLeft: 8 }}>
            ({rating.count} review{rating.count === 1 ? "" : "s"})
          </span>
        </p>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)", margin: "1rem 0 0.5rem" }}>Review history</p>
        {myReviews.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", margin: 0 }}>No reviews yet — they appear after guardians submit ratings.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {myReviews.map((r) => (
              <li key={r.id} className="ph-surface" style={{ padding: "0.65rem 0.85rem", fontSize: "0.9rem" }}>
                <div style={{ fontWeight: 700, color: "var(--color-primary-dark)" }}>{r.stars}★</div>
                <div style={{ color: "var(--color-muted)" }}>{r.feedback || "No written feedback."}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: 4 }}>{new Date(r.at).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      <p style={{ marginTop: "1.25rem" }}>
        <Link className="ph-btn ph-btn-ghost" to="/pawvet">
          ← PawVet home
        </Link>
      </p>
    </div>
  );
}
