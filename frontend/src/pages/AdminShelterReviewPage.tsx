import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, FileText, Shield, Trash2, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { AdoptionListingDto, ShelterDto } from "../types";
import { AdminAdoptRemoveDialog } from "../adopt/AdminAdoptRemoveDialog";
import "../adopt/adopt.css";

function Row({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : String(value);
  const muted = display === "—";
  return (
    <div className="admin-review-row">
      <div className="admin-review-row__label">{label}</div>
      <div className="admin-review-row__value" data-muted={muted}>
        {display}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="admin-review-block">
      <h2 className="admin-review-block__title">{title}</h2>
      {children}
    </section>
  );
}

function DocLink({ label, url }: { label: string; url: string | null | undefined }) {
  return (
    <div className="admin-review-doc">
      <FileText size={18} aria-hidden />
      <div>
        <div className="admin-review-doc__label">{label}</div>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="admin-review-doc__link">
            Open file <ExternalLink size={14} aria-hidden />
          </a>
        ) : (
          <span className="admin-review-doc__missing">Not uploaded</span>
        )}
      </div>
    </div>
  );
}

export function AdminShelterReviewPage() {
  const { shelterId } = useParams();
  const nav = useNavigate();
  const id = shelterId ? Number(shelterId) : NaN;
  const [s, setS] = useState<ShelterDto | null>(null);
  const [listings, setListings] = useState<AdoptionListingDto[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  type ConfirmDialog = "approve" | "acceptAppeal" | "revoke" | null;
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
  const [removeListingId, setRemoveListingId] = useState<number | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [rejectAppealOpen, setRejectAppealOpen] = useState(false);
  const [rejectAppealNote, setRejectAppealNote] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setErr("Invalid shelter id");
      return;
    }
    setErr(null);
    try {
      setS(await api<ShelterDto>(`/api/admin/shelters/${id}`));
    } catch (e: unknown) {
      setS(null);
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!s?.id) {
      setListings([]);
      return;
    }
    let cancelled = false;
    void api<AdoptionListingDto[]>(`/api/admin/shelters/${s.id}/adoption-listings`)
      .then((r) => {
        if (!cancelled) setListings(r);
      })
      .catch(() => {
        if (!cancelled) setListings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [s?.id]);

  async function confirmApprove() {
    if (!Number.isFinite(id)) return;
    setConfirmDialog(null);
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${id}/approve`, { method: "POST" });
      nav("/adopt/admin/shelters");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDecline() {
    if (!Number.isFinite(id)) return;
    setDeclineOpen(false);
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason.trim() || null }),
      });
      setDeclineReason("");
      nav("/adopt/admin/shelters");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Decline failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAcceptAppeal() {
    if (!Number.isFinite(id)) return;
    setConfirmDialog(null);
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${id}/appeal/accept`, { method: "POST" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRejectAppeal() {
    if (!Number.isFinite(id)) return;
    setRejectAppealOpen(false);
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${id}/appeal/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectAppealNote.trim() || null }),
      });
      setRejectAppealNote("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRevoke() {
    if (!Number.isFinite(id)) return;
    setConfirmDialog(null);
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${id}/revoke-verification`, { method: "POST" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isFinite(id)) {
    return (
      <div className="admin-review-page ph-surface">
        <p>Invalid link.</p>
        <Link to="/adopt/admin/shelters">← Queue</Link>
      </div>
    );
  }

  if (err && !s) {
    return (
      <div className="admin-review-page ph-surface">
        <p style={{ color: "#b42318" }} role="alert">
          {err}
        </p>
        <Link to="/adopt/admin/shelters">← Queue</Link>
      </div>
    );
  }

  if (!s) {
    return (
      <div className="admin-review-page ph-surface">
        <p style={{ color: "var(--color-muted)" }}>Loading…</p>
      </div>
    );
  }

  const canDecide = s.status === "PENDING";
  const appealPending = s.status === "REJECTED" && s.appealState === "PENDING";
  const submitted = s.profileCompletedAt ? new Date(s.profileCompletedAt).toLocaleString() : null;

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

  return (
    <div className="admin-review-page">
      {confirmDialog === "approve" && s ? (
        <div role="dialog" aria-modal aria-labelledby="sh-confirm-approve-title" style={overlayStyle} onClick={() => setConfirmDialog(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 420, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <h3 id="sh-confirm-approve-title" style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                Approve shelter?
              </h3>
              <button type="button" className="ph-btn ph-btn-ghost" aria-label="Close" onClick={() => setConfirmDialog(null)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "0.92rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
              Approve <strong>{s.name}</strong> as a verified Paw Adopt partner?
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="ph-btn ph-btn-ghost" disabled={busy} onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
              <button type="button" className="ph-btn ph-btn-primary" disabled={busy} onClick={() => void confirmApprove()}>
                Approve shelter
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {declineOpen && s ? (
        <div role="dialog" aria-modal aria-labelledby="sh-decline-title" style={overlayStyle} onClick={() => !busy && setDeclineOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 440, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <h3 id="sh-decline-title" style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                Decline application
              </h3>
              <button type="button" className="ph-btn ph-btn-ghost" aria-label="Close" disabled={busy} onClick={() => setDeclineOpen(false)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
              <strong>{s.name}</strong> will see a not-approved status. Optionally add a note shown in-app.
            </p>
            <textarea
              className="ph-textarea"
              rows={4}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Optional note to the shelter…"
              style={{ width: "100%", marginBottom: "0.75rem" }}
              disabled={busy}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="ph-btn ph-btn-ghost" disabled={busy} onClick={() => setDeclineOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="ph-btn ph-btn-primary"
                style={{ background: "#b42318", borderColor: "#b42318" }}
                disabled={busy}
                onClick={() => void confirmDecline()}
              >
                Decline application
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {confirmDialog === "acceptAppeal" ? (
        <div role="dialog" aria-modal aria-labelledby="sh-accept-appeal-title" style={overlayStyle} onClick={() => setConfirmDialog(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 420, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <h3 id="sh-accept-appeal-title" style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                Accept appeal?
              </h3>
              <button type="button" className="ph-btn ph-btn-ghost" aria-label="Close" onClick={() => setConfirmDialog(null)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "0.92rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
              Restore verified partner status? They can publish listings again.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="ph-btn ph-btn-ghost" disabled={busy} onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
              <button type="button" className="ph-btn ph-btn-primary" disabled={busy} onClick={() => void confirmAcceptAppeal()}>
                Accept appeal
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {rejectAppealOpen ? (
        <div role="dialog" aria-modal aria-labelledby="sh-reject-appeal-title" style={overlayStyle} onClick={() => !busy && setRejectAppealOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 440, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <h3 id="sh-reject-appeal-title" style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                Reject appeal (final)
              </h3>
              <button type="button" className="ph-btn ph-btn-ghost" aria-label="Close" disabled={busy} onClick={() => setRejectAppealOpen(false)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
              The shelter cannot submit another appeal after this decision.
            </p>
            <textarea
              className="ph-textarea"
              rows={3}
              value={rejectAppealNote}
              onChange={(e) => setRejectAppealNote(e.target.value)}
              placeholder="Optional note to the shelter…"
              style={{ width: "100%", marginBottom: "0.75rem" }}
              disabled={busy}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="ph-btn ph-btn-ghost" disabled={busy} onClick={() => setRejectAppealOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="ph-btn ph-btn-primary"
                style={{ background: "#b42318", borderColor: "#b42318" }}
                disabled={busy}
                onClick={() => void confirmRejectAppeal()}
              >
                Reject appeal
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {confirmDialog === "revoke" && s ? (
        <div role="dialog" aria-modal aria-labelledby="sh-revoke-title" style={overlayStyle} onClick={() => setConfirmDialog(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ph-surface"
            style={{ maxWidth: 440, width: "100%", padding: "1.25rem", borderRadius: 12, border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <h3 id="sh-revoke-title" style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                Revoke verification?
              </h3>
              <button type="button" className="ph-btn ph-btn-ghost" aria-label="Close" onClick={() => setConfirmDialog(null)}>
                <X size={20} aria-hidden />
              </button>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "0.92rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
              Revoke verified status for <strong>{s.name}</strong>? Live adoption listings will disappear from the public gallery and the shelter will be
              notified.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="ph-btn ph-btn-ghost" disabled={busy} onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="ph-btn ph-btn-primary"
                style={{ background: "#b42318", borderColor: "#b42318" }}
                disabled={busy}
                onClick={() => void confirmRevoke()}
              >
                Revoke verification
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      <div className="admin-review-page__toolbar ph-surface">
        <Link to="/adopt/admin/shelters" className="admin-review-back">
          <ArrowLeft size={16} aria-hidden /> Back to queue
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Shield size={22} aria-hidden />
          <span style={{ fontWeight: 700 }}>Shelter review</span>
        </div>
      </div>

      <div className="admin-review-scroll">
        <header className="admin-review-header ph-surface">
          <h1 className="admin-review-header__title">{s.name}</h1>
          <p className="admin-review-header__meta">
            <span>
              Status: <strong>{s.status}</strong>
            </span>
            {submitted && (
              <span>
                · Dossier submitted: <strong>{submitted}</strong>
              </span>
            )}
            <span>
              · Owner user <strong>#{s.ownerUserId}</strong>
            </span>
          </p>
          {s.applicationRejectionReason ? (
            <p className="admin-review-banner admin-review-banner--warn" style={{ marginTop: "0.5rem" }}>
              <strong>Last rejection note:</strong> {s.applicationRejectionReason}
            </p>
          ) : null}
          {appealPending && s.appealMessage ? (
            <p className="admin-review-banner admin-review-banner--info" style={{ marginTop: "0.5rem" }}>
              <strong>Appeal message:</strong> {s.appealMessage}
            </p>
          ) : null}
          {!canDecide && !appealPending && s.status !== "APPROVED" && (
            <p className="admin-review-banner admin-review-banner--info">
              No pending application actions for this row. You can still remove individual adoption listings below.
            </p>
          )}
          {appealPending && (
            <p className="admin-review-banner admin-review-banner--info">
              This shelter has a pending appeal — accept to restore <strong>verified</strong> partner status (listings can
              show again), or reject the appeal permanently (no further appeals).
            </p>
          )}
          {canDecide && !s.profileCompletedAt && (
            <p className="admin-review-banner admin-review-banner--warn">
              Dossier not marked complete by the applicant — review raw fields below or wait for them to submit.
            </p>
          )}
          {err && (
            <p className="admin-review-banner admin-review-banner--err" role="alert">
              {err}
            </p>
          )}
        </header>

        <Block title="Identity & public contact">
          <Row label="Legal entity name" value={s.legalEntityName} />
          <Row label="Tax / charity ID" value={s.einOrTaxId} />
          <Row label="Year founded" value={s.yearFounded} />
          <Row label="Website" value={s.websiteUrl} />
          <Row label="Social / other links" value={s.socialWebsiteHandles} />
          <Row label="City" value={s.city} />
          <Row label="Region" value={s.region} />
          <Row label="Phone" value={s.phone} />
          <Row label="Email" value={s.emailContact} />
        </Block>

        <Block title="Facility & operations">
          <Row label="Facility address" value={s.facilityAddress} />
          <Row label="Mailing same as facility" value={s.mailingSameAsFacility} />
          <Row label="Mailing address" value={s.mailingAddress} />
          <Row label="Species focus" value={s.animalFocus} />
          <Row label="Avg. monthly intakes" value={s.avgMonthlyIntakes} />
          <Row label="Avg. cats in care" value={s.avgCatsInCare} />
          <Row label="Staffing overview" value={s.staffingOverview} />
          <Row label="Volunteer program" value={s.volunteerProgramSummary} />
          <Row label="Public bio" value={s.bio} />
        </Block>

        <Block title="Licensing & adoption">
          <Row label="License status" value={s.stateLicenseStatus} />
          <Row label="Home visit policy" value={s.homeVisitPolicy} />
          <Row label="Adoption fees / donations" value={s.adoptionFeePolicy} />
          <Row label="Spay / neuter policy" value={s.spayNeuterPolicy} />
          <Row label="Return policy" value={s.returnPolicy} />
        </Block>

        <Block title="Medical, behavior & transport">
          <Row label="Medical / veterinary care" value={s.medicalCareDescription} />
          <Row label="Behavior resources" value={s.behaviorModificationResources} />
          <Row label="Transport notes" value={s.transportAssistanceNotes} />
        </Block>

        <Block title="Mission, governance & references">
          <Row label="Mission & impact" value={s.missionStatement} />
          <Row label="Disaster / continuity plan" value={s.disasterContingencyPlan} />
          <Row label="References" value={s.characterReferences} />
          <Row label="Board / director contact" value={s.boardChairOrDirectorContact} />
        </Block>

        <Block title="Uploaded documents">
          <div className="admin-review-docs">
            <DocLink label="Nonprofit / charitable status" url={s.docNonprofitUrl} />
            <DocLink label="Facility license or inspection" url={s.docFacilityLicenseUrl} />
            <DocLink label="Liability insurance" url={s.docInsuranceUrl} />
            <DocLink label="Operating procedures" url={s.docProtocolsUrl} />
          </div>
        </Block>

        <Block title="Adoption listings (admin)">
          {listings.length === 0 ? (
            <p style={{ color: "var(--color-muted)", margin: 0 }}>No adoption listings on file for this shelter.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {listings.map((l) => (
                <li
                  key={l.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "0.5rem",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <span>
                    <strong>{l.petName ?? l.title}</strong>{" "}
                    <span style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>({l.status})</span>
                  </span>
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    <Link className="ph-btn ph-btn-ghost" style={{ fontSize: "0.82rem" }} to={`/adopt/${l.id}`}>
                      View
                    </Link>
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost"
                      style={{ fontSize: "0.82rem", color: "#b42318" }}
                      disabled={removeListingId !== null}
                      onClick={() => setRemoveListingId(l.id)}
                    >
                      <Trash2 size={14} aria-hidden style={{ marginRight: 4, verticalAlign: "middle" }} />
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>

      <footer className="admin-review-footer ph-surface">
        <div className="admin-review-footer__inner">
          <span className="admin-review-footer__hint">
            {canDecide
              ? "Verify documents open correctly before approving."
              : appealPending
                ? "Accepting an appeal verifies the shelter again; rejecting closes appeals permanently."
                : s.status === "APPROVED"
                  ? "Revoking verification notifies the shelter and hides their public listings."
                  : "Use the queue to find other submissions."}
          </span>
          <div className="admin-review-footer__actions">
            <button type="button" className="ph-btn ph-btn-ghost" disabled={busy} onClick={() => nav("/adopt/admin/shelters")}>
              Back to list
            </button>
            {canDecide ? (
              <>
                <button
                  type="button"
                  className="ph-btn ph-btn-ghost"
                  style={{ color: "#b42318", borderColor: "color-mix(in srgb, #b42318 35%, transparent)" }}
                  disabled={busy}
                  onClick={() => {
                    setDeclineReason("");
                    setDeclineOpen(true);
                  }}
                >
                  Decline
                </button>
                <button type="button" className="ph-btn ph-btn-primary" disabled={busy} onClick={() => setConfirmDialog("approve")}>
                  Approve shelter
                </button>
              </>
            ) : appealPending ? (
              <>
                <button
                  type="button"
                  className="ph-btn ph-btn-ghost"
                  style={{ color: "#b42318", borderColor: "color-mix(in srgb, #b42318 35%, transparent)" }}
                  disabled={busy}
                  onClick={() => {
                    setRejectAppealNote("");
                    setRejectAppealOpen(true);
                  }}
                >
                  Reject appeal (final)
                </button>
                <button type="button" className="ph-btn ph-btn-primary" disabled={busy} onClick={() => setConfirmDialog("acceptAppeal")}>
                  Accept appeal
                </button>
              </>
            ) : s.status === "APPROVED" ? (
              <button
                type="button"
                className="ph-btn ph-btn-ghost"
                style={{ color: "#b42318", borderColor: "color-mix(in srgb, #b42318 35%, transparent)" }}
                disabled={busy}
                onClick={() => setConfirmDialog("revoke")}
              >
                Revoke shelter verification
              </button>
            ) : null}
          </div>
        </div>
      </footer>

      <AdminAdoptRemoveDialog
        open={removeListingId !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveListingId(null);
        }}
        listingId={removeListingId ?? 0}
        onRemoved={() => {
          const lid = removeListingId;
          if (lid != null) setListings((prev) => prev.filter((x) => x.id !== lid));
        }}
      />
    </div>
  );
}
