import { FormEvent, useCallback, useMemo, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { api, apiUrl, getToken } from "../api/client";
import type { ShelterDto } from "../types";
import "../adopt/adopt.css";

type DocKind = "NONPROFIT" | "FACILITY_LICENSE" | "INSURANCE" | "OPERATING_PROTOCOLS";

type Draft = {
  name: string;
  city: string;
  region: string;
  phone: string;
  emailContact: string;
  bio: string;
  legalEntityName: string;
  einOrTaxId: string;
  yearFounded: string;
  websiteUrl: string;
  facilityAddress: string;
  mailingSameAsFacility: boolean;
  mailingAddress: string;
  animalFocus: string;
  avgMonthlyIntakes: string;
  avgCatsInCare: string;
  staffingOverview: string;
  volunteerProgramSummary: string;
  stateLicenseStatus: string;
  homeVisitPolicy: string;
  adoptionFeePolicy: string;
  spayNeuterPolicy: string;
  returnPolicy: string;
  medicalCareDescription: string;
  behaviorModificationResources: string;
  transportAssistanceNotes: string;
  disasterContingencyPlan: string;
  characterReferences: string;
  missionStatement: string;
  boardChairOrDirectorContact: string;
  socialWebsiteHandles: string;
};

function fromDto(p: ShelterDto): Draft {
  return {
    name: p.name ?? "",
    city: p.city ?? "",
    region: p.region ?? "",
    phone: p.phone ?? "",
    emailContact: p.emailContact ?? "",
    bio: p.bio ?? "",
    legalEntityName: p.legalEntityName ?? "",
    einOrTaxId: p.einOrTaxId ?? "",
    yearFounded: p.yearFounded != null ? String(p.yearFounded) : "",
    websiteUrl: p.websiteUrl ?? "",
    facilityAddress: p.facilityAddress ?? "",
    mailingSameAsFacility: p.mailingSameAsFacility !== false,
    mailingAddress: p.mailingAddress ?? "",
    animalFocus: p.animalFocus ?? "",
    avgMonthlyIntakes: p.avgMonthlyIntakes != null ? String(p.avgMonthlyIntakes) : "",
    avgCatsInCare: p.avgCatsInCare != null ? String(p.avgCatsInCare) : "",
    staffingOverview: p.staffingOverview ?? "",
    volunteerProgramSummary: p.volunteerProgramSummary ?? "",
    stateLicenseStatus: p.stateLicenseStatus ?? "",
    homeVisitPolicy: p.homeVisitPolicy ?? "",
    adoptionFeePolicy: p.adoptionFeePolicy ?? "",
    spayNeuterPolicy: p.spayNeuterPolicy ?? "",
    returnPolicy: p.returnPolicy ?? "",
    medicalCareDescription: p.medicalCareDescription ?? "",
    behaviorModificationResources: p.behaviorModificationResources ?? "",
    transportAssistanceNotes: p.transportAssistanceNotes ?? "",
    disasterContingencyPlan: p.disasterContingencyPlan ?? "",
    characterReferences: p.characterReferences ?? "",
    missionStatement: p.missionStatement ?? "",
    boardChairOrDirectorContact: p.boardChairOrDirectorContact ?? "",
    socialWebsiteHandles: p.socialWebsiteHandles ?? "",
  };
}

function toPayload(d: Draft, markComplete: boolean) {
  const num = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  return {
    markComplete,
    name: d.name.trim(),
    city: d.city.trim() || null,
    region: d.region.trim() || null,
    phone: d.phone.trim() || null,
    emailContact: d.emailContact.trim() || null,
    bio: d.bio.trim() || null,
    legalEntityName: d.legalEntityName.trim() || null,
    einOrTaxId: d.einOrTaxId.trim() || null,
    yearFounded: num(d.yearFounded),
    websiteUrl: d.websiteUrl.trim() || null,
    facilityAddress: d.facilityAddress.trim() || null,
    mailingSameAsFacility: d.mailingSameAsFacility,
    mailingAddress: d.mailingAddress.trim() || null,
    animalFocus: d.animalFocus.trim() || null,
    avgMonthlyIntakes: num(d.avgMonthlyIntakes),
    avgCatsInCare: num(d.avgCatsInCare),
    staffingOverview: d.staffingOverview.trim() || null,
    volunteerProgramSummary: d.volunteerProgramSummary.trim() || null,
    stateLicenseStatus: d.stateLicenseStatus.trim() || null,
    homeVisitPolicy: d.homeVisitPolicy.trim() || null,
    adoptionFeePolicy: d.adoptionFeePolicy.trim() || null,
    spayNeuterPolicy: d.spayNeuterPolicy.trim() || null,
    returnPolicy: d.returnPolicy.trim() || null,
    medicalCareDescription: d.medicalCareDescription.trim() || null,
    behaviorModificationResources: d.behaviorModificationResources.trim() || null,
    transportAssistanceNotes: d.transportAssistanceNotes.trim() || null,
    disasterContingencyPlan: d.disasterContingencyPlan.trim() || null,
    characterReferences: d.characterReferences.trim() || null,
    missionStatement: d.missionStatement.trim() || null,
    boardChairOrDirectorContact: d.boardChairOrDirectorContact.trim() || null,
    socialWebsiteHandles: d.socialWebsiteHandles.trim() || null,
  };
}

type Props = {
  profile: ShelterDto;
  onProfileUpdated: (p: ShelterDto) => void;
};

export function ShelterProfileWizard({ profile, onProfileUpdated }: Props) {
  const [draft, setDraft] = useState(() => fromDto(profile));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const docs = useMemo(
    () => ({
      NONPROFIT: profile.docNonprofitUrl,
      FACILITY_LICENSE: profile.docFacilityLicenseUrl,
      INSURANCE: profile.docInsuranceUrl,
      OPERATING_PROTOCOLS: profile.docProtocolsUrl,
    }),
    [profile],
  );

  const set = useCallback(<K extends keyof Draft>(key: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: v }));
  }, []);

  async function save(markComplete: boolean) {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const updated = await api<ShelterDto>("/api/adopt/shelters/mine/profile", {
        method: "PUT",
        body: JSON.stringify(toPayload(draft, markComplete)),
      });
      if (markComplete) {
        onProfileUpdated(updated);
        return;
      }
      setDraft(fromDto(updated));
      onProfileUpdated(updated);
      setOk("Progress saved.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc(kind: DocKind, file: File | null) {
    if (!file) return;
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = getToken();
      const res = await fetch(apiUrl(`/api/adopt/shelters/mine/documents?kind=${kind}`), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        let msg = "Upload failed";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const updated = (await res.json()) as ShelterDto;
      onProfileUpdated(updated);
      setOk("Document uploaded.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent, markComplete: boolean) {
    e.preventDefault();
    void save(markComplete);
  }

  function DocRow({
    title,
    hint,
    kind,
    url,
  }: {
    title: string;
    hint: string;
    kind: DocKind;
    url: string | null | undefined;
  }) {
    return (
      <div className="shelter-doc-row">
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <p className="shelter-doc-row__hint">{hint}</p>
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="shelter-doc-row__link">
              <FileText size={16} aria-hidden /> View uploaded file
            </a>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>No file yet</span>
          )}
        </div>
        <label className="shelter-doc-row__upload">
          <Upload size={16} aria-hidden />
          <span>Replace / upload</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
            disabled={busy}
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              ev.target.value = "";
              void uploadDoc(kind, f ?? null);
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <form
      className="shelter-wiz ph-surface"
      onSubmit={(e) => onSubmit(e, false)}
      style={{ padding: "clamp(1.15rem, 2.5vw, 1.75rem)", borderRadius: 22 }}
    >
      <div className="shelter-wiz__intro">
        <h2 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)", fontSize: "1.45rem" }}>
          Shelter partner dossier
        </h2>
        <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.65 }}>
          This detailed application helps PawHub verify legitimate rescue partners. Save drafts anytime. When you
          mark the dossier complete, this questionnaire closes and you will only see a short “pending approval” screen
          until an admin decides.
        </p>
        {(profile.profileCompletedAt || profile.profileLastSavedAt) && (
          <p className="shelter-wiz__meta">
            {profile.profileCompletedAt && (
              <span>
                Dossier marked complete:{" "}
                <strong>{new Date(profile.profileCompletedAt).toLocaleString()}</strong>
              </span>
            )}
            {profile.profileLastSavedAt && (
              <span style={{ marginLeft: profile.profileCompletedAt ? "1rem" : 0 }}>
                Last saved: <strong>{new Date(profile.profileLastSavedAt).toLocaleString()}</strong>
              </span>
            )}
          </p>
        )}
      </div>

      <section className="shelter-wiz__section">
        <h3>1 · Public & legal identity</h3>
        <div className="ph-grid ph-grid-2">
          <label>
            Public shelter name
            <input className="ph-input" value={draft.name} onChange={(e) => set("name", e.target.value)} required />
          </label>
          <label>
            Legal / registered entity name
            <input
              className="ph-input"
              value={draft.legalEntityName}
              onChange={(e) => set("legalEntityName", e.target.value)}
              placeholder="As filed with your state or charity regulator"
            />
          </label>
          <label>
            Tax ID / charity registration (if applicable)
            <input className="ph-input" value={draft.einOrTaxId} onChange={(e) => set("einOrTaxId", e.target.value)} />
          </label>
          <label>
            Year founded
            <input className="ph-input" type="number" min={1800} max={2100} value={draft.yearFounded} onChange={(e) => set("yearFounded", e.target.value)} />
          </label>
          <label>
            Website
            <input className="ph-input" type="url" value={draft.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://…" />
          </label>
          <label>
            Social & other links
            <input className="ph-input" value={draft.socialWebsiteHandles} onChange={(e) => set("socialWebsiteHandles", e.target.value)} placeholder="Instagram, Facebook, Linktree…" />
          </label>
        </div>
      </section>

      <section className="shelter-wiz__section">
        <h3>2 · Facility & daily operations</h3>
        <div className="ph-grid ph-grid-2">
          <label className="shelter-wiz__full">
            Physical facility address (street, city, region, postal)
            <textarea className="ph-textarea" rows={3} value={draft.facilityAddress} onChange={(e) => set("facilityAddress", e.target.value)} />
          </label>
          <label className="shelter-wiz__check">
            <input type="checkbox" checked={draft.mailingSameAsFacility} onChange={(e) => set("mailingSameAsFacility", e.target.checked)} />
            Mailing address same as facility
          </label>
          {!draft.mailingSameAsFacility && (
            <label className="shelter-wiz__full">
              Mailing address
              <textarea className="ph-textarea" rows={2} value={draft.mailingAddress} onChange={(e) => set("mailingAddress", e.target.value)} />
            </label>
          )}
          <label>
            City (public)
            <input className="ph-input" value={draft.city} onChange={(e) => set("city", e.target.value)} />
          </label>
          <label>
            Region / state (public)
            <input className="ph-input" value={draft.region} onChange={(e) => set("region", e.target.value)} />
          </label>
          <label>
            Primary phone
            <input className="ph-input" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
          <label>
            Public adoption email
            <input className="ph-input" type="email" value={draft.emailContact} onChange={(e) => set("emailContact", e.target.value)} />
          </label>
          <label>
            Primary species focus
            <select className="ph-input" value={draft.animalFocus} onChange={(e) => set("animalFocus", e.target.value)}>
              <option value="">Select…</option>
              <option value="CATS_ONLY">Cats only</option>
              <option value="CATS_PRIMARY">Cats primary, occasional other small animals</option>
              <option value="MULTI_SPECIES">Multi-species rescue</option>
            </select>
          </label>
          <label>
            Avg. monthly intakes (approx.)
            <input className="ph-input" type="number" min={0} value={draft.avgMonthlyIntakes} onChange={(e) => set("avgMonthlyIntakes", e.target.value)} />
          </label>
          <label>
            Avg. cats in care at one time
            <input className="ph-input" type="number" min={0} value={draft.avgCatsInCare} onChange={(e) => set("avgCatsInCare", e.target.value)} />
          </label>
          <label className="shelter-wiz__full">
            Staffing overview (roles, FTE, who handles medical decisions)
            <textarea className="ph-textarea" rows={3} value={draft.staffingOverview} onChange={(e) => set("staffingOverview", e.target.value)} />
          </label>
          <label className="shelter-wiz__full">
            Volunteer program summary
            <textarea className="ph-textarea" rows={3} value={draft.volunteerProgramSummary} onChange={(e) => set("volunteerProgramSummary", e.target.value)} />
          </label>
          <label className="shelter-wiz__full">
            Short public bio (shown to adopters in context)
            <textarea className="ph-textarea" rows={3} value={draft.bio} onChange={(e) => set("bio", e.target.value)} />
          </label>
        </div>
      </section>

      <section className="shelter-wiz__section">
        <h3>3 · Licensing & adoption process</h3>
        <div className="ph-grid ph-grid-2">
          <label>
            State / municipal license status
            <select className="ph-input" value={draft.stateLicenseStatus} onChange={(e) => set("stateLicenseStatus", e.target.value)}>
              <option value="">Select…</option>
              <option value="LICENSED_CURRENT">Licensed — current</option>
              <option value="PENDING_RENEWAL">Pending renewal</option>
              <option value="NOT_REQUIRED_JURISDICTION">Not required in our jurisdiction</option>
              <option value="FOSTER_BASED">Foster-home based / no brick-and-mortar license</option>
            </select>
          </label>
          <label>
            Home visit policy for adopters
            <select className="ph-input" value={draft.homeVisitPolicy} onChange={(e) => set("homeVisitPolicy", e.target.value)}>
              <option value="">Select…</option>
              <option value="TYPICALLY_YES">Typically yes</option>
              <option value="CASE_BY_CASE">Case by case</option>
              <option value="RARELY">Rarely / virtual only</option>
            </select>
          </label>
          <label className="shelter-wiz__full">
            Adoption fees, suggested donations, and what they cover
            <textarea className="ph-textarea" rows={3} value={draft.adoptionFeePolicy} onChange={(e) => set("adoptionFeePolicy", e.target.value)} />
          </label>
          <label className="shelter-wiz__full">
            Spay / neuter policy before adoption
            <textarea className="ph-textarea" rows={3} value={draft.spayNeuterPolicy} onChange={(e) => set("spayNeuterPolicy", e.target.value)} />
          </label>
          <label className="shelter-wiz__full">
            Return / reclamation policy if an adoption does not work out
            <textarea className="ph-textarea" rows={3} value={draft.returnPolicy} onChange={(e) => set("returnPolicy", e.target.value)} />
          </label>
        </div>
      </section>

      <section className="shelter-wiz__section">
        <h3>4 · Medical, behavior & transport</h3>
        <div className="ph-grid ph-grid-2">
          <label className="shelter-wiz__full">
            Veterinary partnerships & medical care (vaccines, FIV/FeLV testing, dentals, emergencies)
            <textarea className="ph-textarea" rows={4} value={draft.medicalCareDescription} onChange={(e) => set("medicalCareDescription", e.target.value)} />
          </label>
          <label className="shelter-wiz__full">
            Behavior support & modification resources
            <textarea className="ph-textarea" rows={3} value={draft.behaviorModificationResources} onChange={(e) => set("behaviorModificationResources", e.target.value)} />
          </label>
          <label className="shelter-wiz__full">
            Transport assistance (e.g. long-distance adoptions, volunteer drivers)
            <textarea className="ph-textarea" rows={2} value={draft.transportAssistanceNotes} onChange={(e) => set("transportAssistanceNotes", e.target.value)} />
          </label>
        </div>
      </section>

      <section className="shelter-wiz__section">
        <h3>5 · Resilience, references & mission</h3>
        <div className="ph-grid ph-grid-2">
          <label className="shelter-wiz__full">
            Disaster or disease outbreak contingency plan (who cares for animals, backup locations)
            <textarea className="ph-textarea" rows={3} value={draft.disasterContingencyPlan} onChange={(e) => set("disasterContingencyPlan", e.target.value)} />
          </label>
          <label className="shelter-wiz__full">
            Three professional references (name, role, organization, email or phone)
            <textarea className="ph-textarea" rows={4} value={draft.characterReferences} onChange={(e) => set("characterReferences", e.target.value)} />
          </label>
          <label className="shelter-wiz__full">
            Mission statement & how you measure impact
            <textarea className="ph-textarea" rows={4} value={draft.missionStatement} onChange={(e) => set("missionStatement", e.target.value)} />
          </label>
          <label className="shelter-wiz__full">
            Board chair or executive director contact (for verification only)
            <textarea className="ph-textarea" rows={2} value={draft.boardChairOrDirectorContact} onChange={(e) => set("boardChairOrDirectorContact", e.target.value)} />
          </label>
        </div>
      </section>

      <section className="shelter-wiz__section">
        <h3>6 · Documents (PDF or clear photos)</h3>
        <p className="shelter-wiz__hint">
          Uploads are required before you can mark the dossier complete. Accepted: PDF, PNG, JPG (max size depends on
          server limits).
        </p>
        <div className="shelter-doc-list">
          <DocRow
            title="Nonprofit / charitable status"
            hint="IRS determination letter, state charity registration, or equivalent."
            kind="NONPROFIT"
            url={docs.NONPROFIT}
          />
          <DocRow
            title="Facility license or inspection"
            hint="Kennel license, shelter inspection report, or foster-network agreement."
            kind="FACILITY_LICENSE"
            url={docs.FACILITY_LICENSE}
          />
          <DocRow
            title="General liability insurance"
            hint="Certificate showing coverage for animal care / visitors."
            kind="INSURANCE"
            url={docs.INSURANCE}
          />
          <DocRow
            title="Standard operating procedures"
            hint="Intake, quarantine, medical hold, adoption screening—key pages are fine."
            kind="OPERATING_PROTOCOLS"
            url={docs.OPERATING_PROTOCOLS}
          />
        </div>
      </section>

      <div className="shelter-wiz__footer">
        {err && (
          <p className="shelter-wiz__alert" role="alert">
            {err}
          </p>
        )}
        {ok && <p className="shelter-wiz__ok">{ok}</p>}
        <div className="shelter-wiz__actions">
          <button type="submit" className="ph-btn ph-btn-ghost" disabled={busy}>
            Save progress
          </button>
          <button type="button" className="ph-btn ph-btn-primary" disabled={busy} onClick={(e) => onSubmit(e, true)}>
            Mark dossier complete and submit
          </button>
        </div>
      </div>
    </form>
  );
}
