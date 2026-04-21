import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthShell } from "../auth/AuthShell";
import type { AccountType, RegisterPayload } from "../auth/authTypes";

const TYPES: { id: AccountType; title: string; desc: string }[] = [
  {
    id: "ADOPTER",
    title: "Adopter / explorer",
    desc: "Browse adoption listings, save favorites, and message shelters. Add a cat profile anytime.",
  },
  {
    id: "CAT_OWNER",
    title: "Cat owner",
    desc: "Manage your cats’ profiles, PawMatch, and PawMarket listings — built for multi-cat homes.",
  },
  {
    id: "SHELTER",
    title: "Shelter or rescue",
    desc: "Represent an organization. We’ll create your shelter profile (pending admin approval).",
  },
  {
    id: "VET",
    title: "Veterinarian (PawVet)",
    desc: "Licensed DVM path: upload proving documents, then wait for email and a short credential interview before approval.",
  },
];

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [accountType, setAccountType] = useState<AccountType | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileRegion, setProfileRegion] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [shelterOrgName, setShelterOrgName] = useState("");
  const [shelterCity, setShelterCity] = useState("");
  const [shelterRegion, setShelterRegion] = useState("");
  const [shelterPhone, setShelterPhone] = useState("");
  const [shelterEmailContact, setShelterEmailContact] = useState("");
  const [shelterBio, setShelterBio] = useState("");
  const [vetLicenseNumber, setVetLicenseNumber] = useState("");
  const [vetUniversity, setVetUniversity] = useState("");
  const [vetYearsExperience, setVetYearsExperience] = useState("");
  const [vetPhone, setVetPhone] = useState("");
  const [vetProfessionalBio, setVetProfessionalBio] = useState("");
  const [vetDocFiles, setVetDocFiles] = useState<File[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = accountType !== "";

  const payload = useMemo((): RegisterPayload | null => {
    if (!accountType) return null;
    const base: RegisterPayload = {
      email: email.trim(),
      password,
      displayName: displayName.trim(),
      accountType,
      profileCity: profileCity.trim() || null,
      profileRegion: profileRegion.trim() || null,
      profileBio: profileBio.trim() || null,
    };
    if (accountType === "SHELTER") {
      return {
        ...base,
        shelterOrgName: shelterOrgName.trim() || null,
        shelterCity: shelterCity.trim() || null,
        shelterRegion: shelterRegion.trim() || null,
        shelterPhone: shelterPhone.trim() || null,
        shelterEmailContact: shelterEmailContact.trim() || null,
        shelterBio: shelterBio.trim() || null,
      };
    }
    if (accountType === "VET") {
      const y = vetYearsExperience.trim();
      const years = y === "" ? null : Number.parseInt(y, 10);
      return {
        ...base,
        vetLicenseNumber: vetLicenseNumber.trim() || null,
        vetUniversity: vetUniversity.trim() || null,
        vetYearsExperience: years != null && !Number.isNaN(years) ? years : null,
        vetPhone: vetPhone.trim() || null,
        vetProfessionalBio: vetProfessionalBio.trim() || null,
      };
    }
    return base;
  }, [
    accountType,
    email,
    password,
    displayName,
    profileCity,
    profileRegion,
    profileBio,
    shelterOrgName,
    shelterCity,
    shelterRegion,
    shelterPhone,
    shelterEmailContact,
    shelterBio,
    vetLicenseNumber,
    vetUniversity,
    vetYearsExperience,
    vetPhone,
    vetProfessionalBio,
  ]);

  function onAvatarChange(f: File | null) {
    setAvatarFile(f);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!payload) {
      setErr("Choose how you’ll use PawHub.");
      return;
    }
    if (payload.accountType === "SHELTER" && !payload.shelterOrgName?.trim()) {
      setErr("Shelter / rescue name is required.");
      return;
    }
    if (payload.accountType === "VET") {
      if (!payload.vetLicenseNumber?.trim() || !payload.vetUniversity?.trim()) {
        setErr("License number and university / DVM program are required for veterinarian accounts.");
        return;
      }
      const y = payload.vetYearsExperience;
      if (y != null && (y < 0 || y > 70)) {
        setErr("Years of experience must be between 0 and 70.");
        return;
      }
      if (vetDocFiles.length < 1) {
        setErr("Please upload at least one proving document (PDF or image), such as your veterinary license or diploma.");
        return;
      }
      if (vetDocFiles.length > 8) {
        setErr("You can upload at most 8 documents.");
        return;
      }
    }
    try {
      await register(payload, avatarFile, payload.accountType === "VET" ? vetDocFiles : undefined);
      if (payload.accountType === "SHELTER") nav("/adopt/shelter");
      else if (payload.accountType === "CAT_OWNER") nav("/cats");
      else if (payload.accountType === "VET") nav("/vet");
      else nav("/adopt");
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Register failed");
    }
  }

  return (
    <AuthShell
      title="Join PawHub"
      subtitle="Pick the journey that fits you. You can always add cat profiles or explore adoption later."
    >
      <div
        style={{
          marginBottom: "1rem",
          padding: "0.65rem 0.75rem",
          background: "#f8f4ef",
          borderRadius: "12px",
          fontSize: "0.85rem",
          color: "var(--color-muted)",
        }}
      >
        <strong style={{ color: "var(--color-text)" }}>Admin access</strong> is not available here; admin accounts are seeded
        for demos only.
      </div>

      <form onSubmit={onSubmit} className="ph-grid" style={{ gap: "1rem" }}>
        <div>
          <span className="ph-label">I am joining as…</span>
          <div className="ph-account-types">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={"ph-account-type" + (accountType === t.id ? " selected" : "")}
                onClick={() => setAccountType(t.id)}
              >
                <div className="ph-account-type-title">{t.title}</div>
                <p className="ph-account-type-desc">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="ph-label">Display name</span>
          <input className="ph-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </div>
        <div>
          <span className="ph-label">Email</span>
          <input className="ph-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </div>
        <div>
          <span className="ph-label">Password (min 6)</span>
          <input
            className="ph-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            minLength={6}
            required
          />
        </div>

        <div>
          <span className="ph-label">Profile photo (optional)</span>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            {avatarPreview && <img src={avatarPreview} alt="" className="ph-avatar-preview" />}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div>
          <span className="ph-label">City & region (optional)</span>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              className="ph-input"
              placeholder="City"
              value={profileCity}
              onChange={(e) => setProfileCity(e.target.value)}
              style={{ flex: 1, minWidth: 120 }}
            />
            <input
              className="ph-input"
              placeholder="Region / state"
              value={profileRegion}
              onChange={(e) => setProfileRegion(e.target.value)}
              style={{ flex: 1, minWidth: 120 }}
            />
          </div>
        </div>
        <div>
          <span className="ph-label">About you (optional)</span>
          <textarea className="ph-textarea" rows={3} value={profileBio} onChange={(e) => setProfileBio(e.target.value)} />
        </div>

        {accountType === "VET" && (
          <div
            className="ph-surface"
            style={{ padding: "1rem", background: "color-mix(in srgb, var(--pawvet-medical, #0d6efd) 8%, #faf8f5)", border: "1px dashed var(--color-border)" }}
          >
            <strong style={{ display: "block", marginBottom: "0.75rem", fontFamily: "var(--font-display)" }}>
              Veterinary license application
            </strong>
            <p style={{ margin: "0 0 0.85rem", fontSize: "0.88rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
              Your account is created right away, but you <strong>cannot</strong> claim PawVet cases until our team verifies your
              documents. Watch the email address you use below: we will contact you there to schedule a brief credential
              interview (video or phone) before final approval.
            </p>
            <div className="ph-grid" style={{ gap: "0.75rem" }}>
              <div>
                <span className="ph-label">Proving documents * (PDF or images, up to 8)</span>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*,.pdf"
                  onChange={(e) => setVetDocFiles(Array.from(e.target.files ?? []))}
                  style={{ fontSize: "0.88rem", marginTop: 4 }}
                />
                {vetDocFiles.length > 0 ? (
                  <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--color-muted)" }}>
                    Selected: {vetDocFiles.length} file{vetDocFiles.length === 1 ? "" : "s"} — {vetDocFiles.map((f) => f.name).join(", ")}
                  </p>
                ) : (
                  <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "#a67c00" }}>At least one document is required.</p>
                )}
              </div>
              <div>
                <span className="ph-label">License / registration number *</span>
                <input className="ph-input" value={vetLicenseNumber} onChange={(e) => setVetLicenseNumber(e.target.value)} required={accountType === "VET"} />
              </div>
              <div>
                <span className="ph-label">University / DVM program *</span>
                <input className="ph-input" value={vetUniversity} onChange={(e) => setVetUniversity(e.target.value)} required={accountType === "VET"} />
              </div>
              <div>
                <span className="ph-label">Years in practice (optional)</span>
                <input
                  className="ph-input"
                  inputMode="numeric"
                  value={vetYearsExperience}
                  onChange={(e) => setVetYearsExperience(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 8"
                  style={{ maxWidth: 160 }}
                />
              </div>
              <div>
                <span className="ph-label">Professional phone (optional)</span>
                <input className="ph-input" value={vetPhone} onChange={(e) => setVetPhone(e.target.value)} />
              </div>
              <div>
                <span className="ph-label">Clinical focus & credentials notes (optional)</span>
                <textarea className="ph-textarea" rows={4} value={vetProfessionalBio} onChange={(e) => setVetProfessionalBio(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {accountType === "SHELTER" && (
          <div
            className="ph-surface"
            style={{ padding: "1rem", background: "#faf8f5", border: "1px dashed var(--color-border)" }}
          >
            <strong style={{ display: "block", marginBottom: "0.75rem", fontFamily: "var(--font-display)" }}>
              Organization details
            </strong>
            <div className="ph-grid" style={{ gap: "0.75rem" }}>
              <div>
                <span className="ph-label">Shelter / rescue name *</span>
                <input
                  className="ph-input"
                  value={shelterOrgName}
                  onChange={(e) => setShelterOrgName(e.target.value)}
                  required={accountType === "SHELTER"}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  className="ph-input"
                  placeholder="City"
                  value={shelterCity}
                  onChange={(e) => setShelterCity(e.target.value)}
                  style={{ flex: 1, minWidth: 120 }}
                />
                <input
                  className="ph-input"
                  placeholder="Region"
                  value={shelterRegion}
                  onChange={(e) => setShelterRegion(e.target.value)}
                  style={{ flex: 1, minWidth: 120 }}
                />
              </div>
              <div>
                <span className="ph-label">Public phone</span>
                <input className="ph-input" value={shelterPhone} onChange={(e) => setShelterPhone(e.target.value)} />
              </div>
              <div>
                <span className="ph-label">Public contact email</span>
                <input className="ph-input" type="email" value={shelterEmailContact} onChange={(e) => setShelterEmailContact(e.target.value)} />
              </div>
              <div>
                <span className="ph-label">Organization bio</span>
                <textarea className="ph-textarea" rows={3} value={shelterBio} onChange={(e) => setShelterBio(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {err && (
          <div style={{ color: "#b42318", fontSize: "0.9rem", padding: "0.5rem 0.65rem", background: "#fef2f2", borderRadius: "10px" }}>
            {err}
          </div>
        )}

        <button className="ph-btn ph-btn-primary" type="submit" style={{ width: "100%", padding: "0.65rem" }} disabled={!canSubmit}>
          Create account
        </button>
      </form>

      <p style={{ marginTop: "1.25rem", textAlign: "center", color: "var(--color-muted)", fontSize: "0.95rem" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ fontWeight: 600, color: "var(--color-primary-dark)" }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
