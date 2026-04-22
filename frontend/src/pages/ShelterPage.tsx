import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, ClipboardList, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ShelterProfileWizard } from "../shelter/ShelterProfileWizard";
import type { ShelterDto } from "../types";
import "../adopt/adopt.css";

export function ShelterPage() {
  const { user } = useAuth();
  const [existing, setExisting] = useState<ShelterDto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [bio, setBio] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const reloadShelter = useCallback(async () => {
    try {
      const s = await api<ShelterDto | null>("/api/adopt/shelters/mine");
      setExisting(s);
      if (s) {
        setName(s.name);
        setCity(s.city ?? "");
        setRegion(s.region ?? "");
        setPhone(s.phone ?? "");
        setEmailContact(s.emailContact ?? "");
        setBio(s.bio ?? "");
      }
    } catch {
      setExisting(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await reloadShelter();
      setLoaded(true);
    })();
  }, [reloadShelter]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      if (existing) {
        setMsg("You already have a shelter application on file.");
        return;
      }
      await api("/api/adopt/shelters", {
        method: "POST",
        body: JSON.stringify({
          name,
          city: city || null,
          region: region || null,
          phone: phone || null,
          emailContact: emailContact || null,
          bio: bio || null,
        }),
      });
      setMsg("Application submitted. Our team will verify your shelter before any cats go live on Paw Adopt.");
      await reloadShelter();
    } catch (ex: unknown) {
      setMsg(ex instanceof Error ? ex.message : "Failed");
    }
  }

  if (!loaded) {
    return (
      <div className="shelter-landing">
        <p style={{ color: "var(--color-muted)" }}>Loading…</p>
      </div>
    );
  }

  const isShelterAccount = user?.accountType === "SHELTER";
  /** Still filling the dossier — show full wizard */
  const shelterDossierInProgress =
    isShelterAccount && existing?.status === "PENDING" && !existing.profileCompletedAt;
  /** Dossier submitted; awaiting admin (no form) */
  const shelterPendingReview =
    isShelterAccount && existing?.status === "PENDING" && Boolean(existing.profileCompletedAt);
  const shelterApproved = isShelterAccount && existing?.status === "APPROVED";
  const shelterRejected = isShelterAccount && existing?.status === "REJECTED";

  const statusTone =
    existing?.status === "APPROVED" ? "success" : existing?.status === "PENDING" ? "pending" : existing ? "rejected" : undefined;

  const submittedAt =
    existing?.profileCompletedAt != null ? new Date(existing.profileCompletedAt).toLocaleString() : null;

  return (
    <div className="shelter-landing">
      <p style={{ marginBottom: "0.75rem" }}>
        <Link to="/adopt" style={{ fontWeight: 600 }}>
          ← Paw Adopt
        </Link>
      </p>

      <h1>Shelter verification</h1>

      {shelterDossierInProgress && (
        <p style={{ color: "var(--color-muted)", fontSize: "1.05rem", lineHeight: 1.65, margin: "0 0 1.5rem" }}>
          Paw Adopt lists cats only from <strong>verified shelter partners</strong>. Complete the dossier below; when you
          mark it complete, this page will switch to a simple “pending approval” view until an admin decides.
        </p>
      )}

      {(shelterPendingReview || shelterApproved || shelterRejected) && (
        <p style={{ color: "var(--color-muted)", fontSize: "1.02rem", lineHeight: 1.65, margin: "0 0 1.5rem" }}>
          <strong>{existing?.name}</strong>
        </p>
      )}

      {!shelterPendingReview && !shelterApproved && !shelterRejected && !(isShelterAccount && existing) && (
        <p style={{ color: "var(--color-muted)", fontSize: "1.05rem", lineHeight: 1.65, margin: "0 0 1.5rem" }}>
          Paw Adopt lists cats only from <strong>verified shelter partners</strong>. Shelter accounts complete a detailed
          dossier and upload compliance documents; an admin then confirms your organization before listings go live.
        </p>
      )}

      {shelterDossierInProgress && (
        <div className="shelter-steps" style={{ marginBottom: "1.5rem" }}>
          <div className="shelter-step">
            <span className="shelter-step__num">1</span>
            <p>
              <strong>Register as a shelter</strong> (or use the legacy application below from a non-shelter login).
            </p>
          </div>
          <div className="shelter-step">
            <span className="shelter-step__num">2</span>
            <p>
              <strong>Complete the dossier</strong> — questions and required documents.
            </p>
          </div>
          <div className="shelter-step">
            <span className="shelter-step__num">3</span>
            <p>
              <strong>Mark complete.</strong> After that, this page only shows submission status until you are approved.
            </p>
          </div>
        </div>
      )}

      {!isShelterAccount && existing && statusTone && (
        <div className="adopt-status-card" data-tone={statusTone} style={{ marginBottom: "1.5rem" }}>
          {existing.status === "APPROVED" && <ShieldCheck size={24} aria-hidden style={{ flexShrink: 0, color: "#2d6a4f" }} />}
          {existing.status === "PENDING" && <ClipboardList size={24} aria-hidden style={{ flexShrink: 0, color: "#a67c00" }} />}
          {existing.status === "REJECTED" && <BadgeCheck size={24} aria-hidden style={{ flexShrink: 0, color: "#b42318" }} />}
          <div>
            <h3 style={{ margin: "0 0 0.35rem" }}>{existing.name}</h3>
            <p style={{ margin: 0 }}>
              Status: <strong>{existing.status}</strong>
            </p>
          </div>
        </div>
      )}

      {msg && (
        <p
          style={{
            padding: "0.75rem 1rem",
            borderRadius: 14,
            background: "color-mix(in srgb, var(--color-accent-soft) 55%, transparent)",
            marginBottom: "1rem",
          }}
        >
          {msg}
        </p>
      )}

      {shelterDossierInProgress && existing && (
        <ShelterProfileWizard profile={existing} onProfileUpdated={(p) => setExisting(p)} />
      )}

      {shelterPendingReview && existing && (
        <div className="shelter-submitted-card" data-tone="pending">
          <ClipboardList size={40} strokeWidth={1.5} aria-hidden className="shelter-submitted-card__icon" />
          <h2 className="shelter-submitted-card__title">Submitted — pending approval</h2>
          <p className="shelter-submitted-card__body">
            Thank you. Your shelter dossier and documents are on file. Our team will review everything and update your
            status here. You do not need to submit again.
          </p>
          {submittedAt && (
            <p className="shelter-submitted-card__meta">Received: {submittedAt}</p>
          )}
          <Link className="ph-btn ph-btn-primary" to="/adopt" style={{ marginTop: "0.5rem" }}>
            Back to Paw Adopt
          </Link>
        </div>
      )}

      {shelterApproved && existing && (
        <div className="shelter-submitted-card" data-tone="success">
          <ShieldCheck size={40} strokeWidth={1.5} aria-hidden className="shelter-submitted-card__icon" />
          <h2 className="shelter-submitted-card__title">Verified shelter partner</h2>
          <p className="shelter-submitted-card__body">
            Your organization is approved. You can publish adoption listings and reply to adopters in messages.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            <Link className="ph-btn ph-btn-accent" to="/adopt/new">
              New adoption listing
            </Link>
            <Link className="ph-btn ph-btn-ghost" to="/adopt">
              Browse Paw Adopt
            </Link>
          </div>
        </div>
      )}

      {shelterRejected && existing && (
        <div className="shelter-submitted-card" data-tone="rejected">
          <BadgeCheck size={40} strokeWidth={1.5} aria-hidden className="shelter-submitted-card__icon" />
          <h2 className="shelter-submitted-card__title">Application not approved</h2>
          <p className="shelter-submitted-card__body">
            This shelter application was not approved. If you think this was a mistake, please contact support through
            your usual PawHub channel.
          </p>
          <Link className="ph-btn ph-btn-ghost" to="/adopt">
            Back to Paw Adopt
          </Link>
        </div>
      )}

      {!isShelterAccount && !existing && (
        <div className="ph-surface" style={{ padding: "1.35rem", borderRadius: 20 }}>
          <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Legacy shelter application</h2>
          <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Prefer the full flow?{" "}
            <Link to="/register" style={{ fontWeight: 600 }}>
              Register
            </Link>{" "}
            and choose <strong>Shelter</strong> — you’ll get the detailed dossier, document uploads, and verification
            path automatically.
          </p>
          <form onSubmit={onSubmit} className="ph-grid" style={{ marginTop: "1rem" }}>
            <label>
              Shelter name
              <input className="ph-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              City
              <input className="ph-input" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label>
              Region
              <input className="ph-input" value={region} onChange={(e) => setRegion(e.target.value)} />
            </label>
            <label>
              Phone
              <input className="ph-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              Public contact email
              <input className="ph-input" value={emailContact} onChange={(e) => setEmailContact(e.target.value)} />
            </label>
            <label>
              Bio
              <textarea className="ph-textarea" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </label>
            <button className="ph-btn ph-btn-primary" type="submit">
              Submit for verification
            </button>
          </form>
        </div>
      )}

      {!isShelterAccount && existing && (
        <p style={{ color: "var(--color-muted)", lineHeight: 1.6 }}>
          Detailed dossier editing is available when you are signed in with a <strong>shelter organization</strong>{" "}
          account. Switch accounts or register as a shelter to upload documents and complete the questionnaire.
        </p>
      )}
    </div>
  );
}
