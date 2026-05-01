import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, FileSearch, Shield, X } from "lucide-react";
import { api } from "../api/client";
import type { ShelterDto } from "../types";
import "../adopt/adopt.css";

type Tab = "all" | "pending" | "appeals" | "approved" | "rejected";

function labelStatus(status: string): string {
  if (status === "PENDING") return "Pending";
  if (status === "APPROVED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return status;
}

function StatusBadge({ status }: { status: string }) {
  const bg =
    status === "APPROVED"
      ? "rgba(22, 163, 74, 0.14)"
      : status === "REJECTED"
        ? "rgba(180, 35, 24, 0.12)"
        : "rgba(217, 119, 6, 0.14)";
  const color =
    status === "APPROVED" ? "#15803d" : status === "REJECTED" ? "#b42318" : "#b45309";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "0.72rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        padding: "0.22rem 0.55rem",
        borderRadius: 999,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {labelStatus(status)}
    </span>
  );
}

export function AdminSheltersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [rows, setRows] = useState<ShelterDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [approveShelter, setApproveShelter] = useState<ShelterDto | null>(null);
  const [declineShelter, setDeclineShelter] = useState<ShelterDto | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineBusy, setDeclineBusy] = useState(false);
  const [revokeShelter, setRevokeShelter] = useState<ShelterDto | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "1rem",
  };

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      if (tab === "all") {
        setRows(await api<ShelterDto[]>("/api/admin/shelters/all"));
      } else if (tab === "pending") {
        setRows(await api<ShelterDto[]>("/api/admin/shelters/pending"));
      } else if (tab === "appeals") {
        setRows(await api<ShelterDto[]>("/api/admin/shelters/appeals-pending"));
      } else if (tab === "approved") {
        setRows(await api<ShelterDto[]>("/api/admin/shelters/by-status?status=APPROVED"));
      } else {
        setRows(await api<ShelterDto[]>("/api/admin/shelters/by-status?status=REJECTED"));
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmQuickApprove() {
    if (!approveShelter) return;
    setActionBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${approveShelter.id}/approve`, { method: "POST" });
      setApproveShelter(null);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmQuickDecline() {
    if (!declineShelter) return;
    setDeclineBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${declineShelter.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason.trim() || null }),
      });
      setDeclineShelter(null);
      setDeclineReason("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Decline failed");
    } finally {
      setDeclineBusy(false);
    }
  }

  async function confirmRevoke() {
    if (!revokeShelter) return;
    setActionBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${revokeShelter.id}/revoke-verification`, { method: "POST" });
      setRevokeShelter(null);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="ph-surface" style={{ padding: "clamp(1.25rem, 3vw, 2rem)", maxWidth: 760, margin: "0 auto" }}>
      {approveShelter ? (
        <div role="dialog" aria-modal aria-labelledby="adm-sh-ap-title" style={overlayStyle} onClick={() => !actionBusy && setApproveShelter(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 420, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <h3 id="adm-sh-ap-title" style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                Quick approve?
              </h3>
              <button type="button" className="ph-btn ph-btn-ghost" aria-label="Close" disabled={actionBusy} onClick={() => setApproveShelter(null)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "0.92rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
              Approve <strong>{approveShelter.name}</strong> without opening the full dossier?
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="ph-btn ph-btn-ghost" disabled={actionBusy} onClick={() => setApproveShelter(null)}>
                Cancel
              </button>
              <button type="button" className="ph-btn ph-btn-primary" disabled={actionBusy} onClick={() => void confirmQuickApprove()}>
                Approve shelter
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {declineShelter ? (
        <div role="dialog" aria-modal aria-labelledby="adm-sh-dec-title" style={overlayStyle} onClick={() => !declineBusy && setDeclineShelter(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 440, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <h3 id="adm-sh-dec-title" style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                Decline application
              </h3>
              <button type="button" className="ph-btn ph-btn-ghost" aria-label="Close" disabled={declineBusy} onClick={() => setDeclineShelter(null)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
              <strong>{declineShelter.name}</strong> will see a not-approved status. Optionally add a note shown in-app.
            </p>
            <textarea
              className="ph-textarea"
              rows={4}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Optional note to the shelter…"
              style={{ width: "100%", marginBottom: "0.75rem" }}
              disabled={declineBusy}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="ph-btn ph-btn-ghost" disabled={declineBusy} onClick={() => setDeclineShelter(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="ph-btn ph-btn-primary"
                style={{ background: "#b42318", borderColor: "#b42318" }}
                disabled={declineBusy}
                onClick={() => void confirmQuickDecline()}
              >
                Decline application
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {revokeShelter ? (
        <div role="dialog" aria-modal aria-labelledby="adm-sh-rv-title" style={overlayStyle} onClick={() => !actionBusy && setRevokeShelter(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 440, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <h3 id="adm-sh-rv-title" style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                Revoke verification?
              </h3>
              <button type="button" className="ph-btn ph-btn-ghost" aria-label="Close" disabled={actionBusy} onClick={() => setRevokeShelter(null)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "0.92rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
              Revoke verified status for <strong>{revokeShelter.name}</strong>? Their public listings will hide and they can submit one appeal from their shelter
              page.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="ph-btn ph-btn-ghost" disabled={actionBusy} onClick={() => setRevokeShelter(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="ph-btn ph-btn-primary"
                style={{ background: "#b42318", borderColor: "#b42318" }}
                disabled={actionBusy}
                onClick={() => void confirmRevoke()}
              >
                Revoke verification
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      <p style={{ marginBottom: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <Link to="/adopt" style={{ fontWeight: 600 }}>
          ← PawAdopt home
        </Link>
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
        <Shield size={26} strokeWidth={1.75} aria-hidden style={{ color: "var(--color-primary-dark)" }} />
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 1.85rem)" }}>
          Shelter administration
        </h1>
      </div>
      <p style={{ color: "var(--color-muted)", lineHeight: 1.65, margin: "0 0 1rem" }}>
        Browse every shelter profile, work the pending queue, decide appeals (including after a verification revoke),
        and revoke verified partners when needed. Use <em>Review application</em> for the full dossier and listings.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "1.25rem", alignItems: "center" }}>
        {(
          [
            ["all", "All"],
            ["pending", "Pending queue"],
            ["appeals", "Appeals"],
            ["approved", "Verified"],
            ["rejected", "Rejected"],
          ] as const
        ).map(([k, label]) => (
          <motion.button
            key={k}
            type="button"
            whileTap={{ scale: 0.97 }}
            className={tab === k ? "ph-btn ph-btn-primary" : "ph-btn ph-btn-ghost"}
            style={{ fontWeight: tab === k ? 700 : 500, fontSize: "0.88rem" }}
            onClick={() => {
              setRows([]);
              setTab(k);
            }}
          >
            {label}
          </motion.button>
        ))}
      </div>

      {err && (
        <p style={{ color: "#b42318", marginBottom: "1rem" }} role="alert">
          {err}
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: loading ? 0.55 : 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {rows.length === 0 && !err && (
            <div className="adopt-gate" style={{ textAlign: "center" }}>
              <BadgeCheck size={32} strokeWidth={1.75} aria-hidden style={{ color: "#2d6a4f", marginBottom: "0.5rem" }} />
              <h2 style={{ margin: "0 0 0.35rem" }}>Nothing here</h2>
              <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.55 }}>
                {tab === "all" && "No shelter records returned."}
                {tab === "pending" && "No pending submissions in this view."}
                {tab === "appeals" && "No shelter appeals awaiting a decision."}
                {tab === "approved" && "No verified shelter rows returned."}
                {tab === "rejected" && "No rejected shelter rows returned."}
              </p>
            </div>
          )}

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {rows.map((s) => (
              <li key={s.id} className="admin-shelter-card">
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                  <h3 style={{ margin: 0, flex: "1 1 auto" }}>{s.name}</h3>
                  <StatusBadge status={s.status} />
                  {s.appealState === "PENDING" ? (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "0.22rem 0.55rem",
                        borderRadius: 999,
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "#1d4ed8",
                      }}
                    >
                      Appeal pending
                    </span>
                  ) : null}
                  {s.appealState === "REJECTED_FINAL" ? (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "0.22rem 0.55rem",
                        borderRadius: 999,
                        background: "rgba(100, 116, 139, 0.18)",
                        color: "#475569",
                      }}
                    >
                      Appeal closed
                    </span>
                  ) : null}
                </div>
                <div className="admin-shelter-meta">
                  Owner user #{s.ownerUserId}
                  <br />
                  {[s.city, s.region].filter(Boolean).join(", ") || "Location not set"}
                  <br />
                  {s.profileCompletedAt ? (
                    <span style={{ color: "#1b4332", fontWeight: 600 }}>
                      Dossier submitted {new Date(s.profileCompletedAt).toLocaleString()}
                    </span>
                  ) : (
                    <span style={{ color: "#a67c00", fontWeight: 600 }}>No dossier timestamp — review carefully</span>
                  )}
                  {s.appealSubmittedAt ? (
                    <>
                      <br />
                      Appeal submitted: {new Date(s.appealSubmittedAt).toLocaleString()}
                    </>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
                  <Link
                    to={`/adopt/admin/shelters/${s.id}`}
                    className="ph-btn ph-btn-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <FileSearch size={16} aria-hidden />
                    Review application
                  </Link>
                  {tab === "pending" && s.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        className="ph-btn ph-btn-ghost"
                        onClick={() => setApproveShelter(s)}
                      >
                        Quick approve
                      </button>
                      <button
                        type="button"
                        className="ph-btn ph-btn-ghost"
                        onClick={() => {
                          setDeclineReason("");
                          setDeclineShelter(s);
                        }}
                      >
                        Quick decline
                      </button>
                    </>
                  )}
                  {(tab === "approved" || tab === "all") && s.status === "APPROVED" && (
                    <button type="button" className="ph-btn ph-btn-ghost" style={{ color: "#b42318" }} onClick={() => setRevokeShelter(s)}>
                      Revoke verification
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
