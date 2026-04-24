import { motion } from "framer-motion";
import { ClipboardList, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { isAdminAccount, isVeterinarianAccount } from "../auth/vetAccess";
import type { CaseUrgency, MedicalCase } from "../store/useVetStore";
import { useVetStore } from "../store/useVetStore";
import type { PawvetTriageCaseDto } from "../types/pawvetTriage";
import "../pawvet/pawvet.css";

function urgencyLabel(u: CaseUrgency) {
  if (u === "urgent") return "Urgent";
  if (u === "soon") return "Soon";
  return "Routine";
}

function caseStatusMeta(c: MedicalCase): { label: string; sub: string } {
  if (c.status === "RESOLVED") {
    return { label: "Finished", sub: c.resolvedAt ? `Closed ${new Date(c.resolvedAt).toLocaleString()}` : "Closed" };
  }
  if (c.status === "IN_PROGRESS") {
    return {
      label: "Active",
      sub: c.vetName ? `With ${c.vetName}` : "A vet is assisting",
    };
  }
  return { label: "Waiting", sub: "No vet has claimed this case yet" };
}

export function PawVetHome() {
  const { user } = useAuth();
  const cases = useVetStore((s) => s.cases);
  const mergeCasesFromApi = useVetStore((s) => s.mergeCasesFromApi);
  const isVet = isVeterinarianAccount(user);

  useEffect(() => {
    if (!user || isVet || isAdminAccount(user)) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await api<PawvetTriageCaseDto[]>("/api/pawvet/triage-cases/mine");
        if (!cancelled) mergeCasesFromApi(rows ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isVet, mergeCasesFromApi]);

  const { waiting, finished } = useMemo(() => {
    if (!user || isVet || isAdminAccount(user)) return { waiting: [] as MedicalCase[], finished: [] as MedicalCase[] };
    const mine = cases
      .filter((c) => c.ownerUserId === user.userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      waiting: mine.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS"),
      finished: mine.filter((c) => c.status === "RESOLVED"),
    };
  }, [cases, user, isVet]);

  if (isAdminAccount(user)) {
    return <Navigate to="/pawvet/admin" replace />;
  }

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
            {isVet ? "Guardian triage" : "I need help"}
          </h2>
          {isVet ? (
            <>
              <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
                Veterinarian accounts cannot file guardian health cases. Use the vet dashboard to review triage after your
                credentials are approved.
              </p>
              <Link className="ph-btn ph-btn-primary" to="/vet">
                Vet dashboard
              </Link>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
                Describe symptoms and attach photos. A verified vet can claim your case.
              </p>
              <Link className="ph-btn ph-btn-primary" to="/pawvet/file-case">
                File a case
              </Link>
            </>
          )}
        </motion.div>

        {!isVet ? (
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
        ) : null}
      </div>

      {!isVet ? (
      <motion.section
        className="pawvet-glass-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        style={{ marginTop: "1.25rem", padding: "1.25rem" }}
        aria-labelledby="pawvet-my-cases-heading"
      >
        <h2
          id="pawvet-my-cases-heading"
          style={{
            margin: "0 0 0.5rem",
            fontFamily: "var(--font-display)",
            color: "var(--color-primary-dark)",
            fontSize: "1.2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
          }}
        >
          <ClipboardList size={22} color="var(--pawvet-medical)" aria-hidden />
          My health cases
        </h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.88rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
          Cases you filed on this device (waiting for a vet, in progress, or finished). Open a row to view the consultation
          room or summary.
        </p>

        {waiting.length === 0 && finished.length === 0 ? (
          <div className="ph-surface" style={{ padding: "1rem", textAlign: "center" }}>
            <p style={{ margin: "0 0 0.75rem", color: "var(--color-muted)", fontSize: "0.92rem" }}>
              You have not filed a health case yet.
            </p>
            <Link className="ph-btn ph-btn-primary" to="/pawvet/file-case">
              File a case
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {waiting.length > 0 ? (
              <div>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)", letterSpacing: "0.04em" }}>
                  Waiting or active
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {waiting.map((c) => {
                    const meta = caseStatusMeta(c);
                    return (
                      <li key={c.id}>
                        <Link
                          to={`/pawvet/case/${c.id}`}
                          className="ph-surface"
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "0.65rem",
                            padding: "0.65rem 0.85rem",
                            textDecoration: "none",
                            color: "inherit",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ fontWeight: 700, color: "var(--color-primary-dark)" }}>{c.catName}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: 2 }}>{meta.sub}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: 4 }}>
                              Filed {new Date(c.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "0.12rem 0.45rem",
                              borderRadius: 999,
                              background: c.status === "IN_PROGRESS" ? "#eff6ff" : "#fffbeb",
                              color: c.status === "IN_PROGRESS" ? "#1e40af" : "#b45309",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            {meta.label}
                          </span>
                          <span className={`pawvet-urgent pawvet-urgent--${c.urgency}`}>{urgencyLabel(c.urgency)}</span>
                          <span className="ph-btn ph-btn-accent" style={{ fontSize: "0.82rem", padding: "0.35rem 0.65rem" }}>
                            Open
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {finished.length > 0 ? (
              <div>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)", letterSpacing: "0.04em" }}>
                  Finished
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {finished.map((c) => {
                    const meta = caseStatusMeta(c);
                    return (
                      <li key={c.id}>
                        <Link
                          to={`/pawvet/case/${c.id}`}
                          className="ph-surface"
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "0.65rem",
                            padding: "0.65rem 0.85rem",
                            textDecoration: "none",
                            color: "inherit",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ fontWeight: 700, color: "var(--color-primary-dark)" }}>{c.catName}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: 2 }}>{meta.sub}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: 4 }}>
                              Filed {new Date(c.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "0.12rem 0.45rem",
                              borderRadius: 999,
                              background: "#ecfdf5",
                              color: "#065f46",
                              border: "1px solid #6ee7b7",
                            }}
                          >
                            {meta.label}
                          </span>
                          <span className={`pawvet-urgent pawvet-urgent--${c.urgency}`}>{urgencyLabel(c.urgency)}</span>
                          <span className="ph-btn ph-btn-ghost" style={{ fontSize: "0.82rem", padding: "0.35rem 0.65rem" }}>
                            View
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </motion.section>
      ) : null}
    </div>
  );
}
