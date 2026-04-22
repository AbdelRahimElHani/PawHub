import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, FileText, Shield } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { ShelterDto } from "../types";
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
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function approve() {
    if (!Number.isFinite(id)) return;
    if (!window.confirm(`Approve "${s?.name}" as a verified shelter partner?`)) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${id}/approve`, { method: "POST" });
      nav("/admin/shelters");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    if (!Number.isFinite(id)) return;
    if (!window.confirm(`Decline "${s?.name}"? They will see a not-approved status on their shelter page.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/admin/shelters/${id}/reject`, { method: "POST" });
      nav("/admin/shelters");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Decline failed");
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isFinite(id)) {
    return (
      <div className="admin-review-page ph-surface">
        <p>Invalid link.</p>
        <Link to="/admin/shelters">← Queue</Link>
      </div>
    );
  }

  if (err && !s) {
    return (
      <div className="admin-review-page ph-surface">
        <p style={{ color: "#b42318" }} role="alert">
          {err}
        </p>
        <Link to="/admin/shelters">← Queue</Link>
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
  const submitted = s.profileCompletedAt ? new Date(s.profileCompletedAt).toLocaleString() : null;

  return (
    <div className="admin-review-page">
      <div className="admin-review-page__toolbar ph-surface">
        <Link to="/admin/shelters" className="admin-review-back">
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
          {!canDecide && (
            <p className="admin-review-banner admin-review-banner--info">
              This application is no longer pending. Approve / decline actions are disabled.
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
      </div>

      <footer className="admin-review-footer ph-surface">
        <div className="admin-review-footer__inner">
          <span className="admin-review-footer__hint">
            {canDecide ? "Verify documents open correctly before approving." : "Use the queue to find other submissions."}
          </span>
          <div className="admin-review-footer__actions">
            <button type="button" className="ph-btn ph-btn-ghost" disabled={busy} onClick={() => nav("/admin/shelters")}>
              Cancel
            </button>
            <button
              type="button"
              className="ph-btn ph-btn-ghost"
              style={{ color: "#b42318", borderColor: "color-mix(in srgb, #b42318 35%, transparent)" }}
              disabled={busy || !canDecide}
              onClick={() => void decline()}
            >
              Decline
            </button>
            <button type="button" className="ph-btn ph-btn-primary" disabled={busy || !canDecide} onClick={() => void approve()}>
              Approve shelter
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
