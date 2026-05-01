import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, FileText, Shield, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { AdoptionListingDto, ShelterDto } from "../types";
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
  const [listingBusy, setListingBusy] = useState<number | null>(null);

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

  async function approve() {
    if (!Number.isFinite(id)) return;
    if (!window.confirm(`Approve "${s?.name}" as a verified shelter partner?`)) return;
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

  async function decline() {
    if (!Number.isFinite(id)) return;
    if (!window.confirm(`Decline "${s?.name}"? They will see a not-approved status on their shelter page.`)) return;
    const reason = window.prompt("Optional note to the shelter (shown in-app, or leave blank):") ?? "";
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${id}/reject`, {
        method: "POST",
        body: reason.trim() ? JSON.stringify({ reason: reason.trim() }) : undefined,
      });
      nav("/adopt/admin/shelters");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Decline failed");
    } finally {
      setBusy(false);
    }
  }

  async function acceptAppeal() {
    if (!Number.isFinite(id)) return;
    if (!window.confirm("Accept this shelter’s appeal and return them to the pending review queue?")) return;
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

  async function rejectAppeal() {
    if (!Number.isFinite(id)) return;
    if (!window.confirm("Reject this appeal? The shelter cannot submit another appeal.")) return;
    const note = window.prompt("Optional note to the shelter:") ?? "";
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${id}/appeal/reject`, {
        method: "POST",
        body: note.trim() ? JSON.stringify({ reason: note.trim() }) : undefined,
      });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function revokeVerification() {
    if (!Number.isFinite(id) || !s) return;
    if (
      !window.confirm(
        `Revoke verified status for "${s.name}"? Their live adoption listings will disappear from the public gallery and they will be notified.`,
      )
    )
      return;
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

  async function removeListing(listingId: number) {
    if (!window.confirm("Remove this adoption listing? The shelter will be notified.")) return;
    setListingBusy(listingId);
    setErr(null);
    try {
      await api(`/api/admin/adopt/listings/${listingId}`, { method: "DELETE" });
      setListings((prev) => prev.filter((x) => x.id !== listingId));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setListingBusy(null);
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

  return (
    <div className="admin-review-page">
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
              This shelter submitted an appeal after rejection — accept to reopen review, or reject to close appeals
              permanently.
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
                      disabled={listingBusy === l.id}
                      onClick={() => void removeListing(l.id)}
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
                ? "Read the appeal message above before deciding."
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
                  onClick={() => void decline()}
                >
                  Decline
                </button>
                <button type="button" className="ph-btn ph-btn-primary" disabled={busy} onClick={() => void approve()}>
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
                  onClick={() => void rejectAppeal()}
                >
                  Reject appeal (final)
                </button>
                <button type="button" className="ph-btn ph-btn-primary" disabled={busy} onClick={() => void acceptAppeal()}>
                  Accept appeal
                </button>
              </>
            ) : s.status === "APPROVED" ? (
              <button
                type="button"
                className="ph-btn ph-btn-ghost"
                style={{ color: "#b42318", borderColor: "color-mix(in srgb, #b42318 35%, transparent)" }}
                disabled={busy}
                onClick={() => void revokeVerification()}
              >
                Revoke shelter verification
              </button>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
