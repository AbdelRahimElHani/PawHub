import { FormEvent, useMemo, useRef, useState, type RefObject } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthShell } from "../auth/AuthShell";
import type { AccountType, RegisterPayload } from "../auth/authTypes";

const TYPES: { id: AccountType; title: string; desc: string; icon: string }[] = [
  {
    id: "ADOPTER",
    icon: "🐾",
    title: "Adopter / explorer",
    desc: "Browse adoption listings, save favorites, and message shelters. You can add a cat profile anytime.",
  },
  {
    id: "CAT_OWNER",
    icon: "🐱",
    title: "Cat owner",
    desc: "Profiles for your cats, PawMatch, and PawMarket — built for multi-cat homes.",
  },
  {
    id: "SHELTER",
    icon: "🏠",
    title: "Shelter or rescue",
    desc: "Represent an organization. We create your shelter profile pending admin approval.",
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const accountSectionRef = useRef<HTMLDivElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const shelterOrgRef = useRef<HTMLInputElement>(null);

  function focusAndScroll(el: HTMLElement | null) {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.focus({ preventScroll: true });
        return;
      }
      el.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")?.focus({ preventScroll: true });
    }, 150);
  }

  function focusFromServerError(message: string) {
    if (/[Ss]helter organization name/.test(message)) {
      focusAndScroll(shelterOrgRef.current);
      return;
    }
    const m = message.match(/^(\w+):/);
    if (!m) return;
    const field = m[1];
    const map: Record<string, RefObject<HTMLElement | null>> = {
      accountType: accountSectionRef,
      displayName: displayNameRef,
      email: emailRef,
      password: passwordRef,
      shelterOrgName: shelterOrgRef,
    };
    const ref = map[field];
    if (ref?.current) focusAndScroll(ref.current);
  }

  function validateBeforeSubmit(): boolean {
    if (!accountType) {
      setErr("Choose how you’ll use PawHub.");
      focusAndScroll(accountSectionRef.current);
      return false;
    }
    if (!displayName.trim()) {
      setErr("Display name is required.");
      focusAndScroll(displayNameRef.current);
      return false;
    }
    const em = email.trim();
    if (!em) {
      setErr("Email is required.");
      focusAndScroll(emailRef.current);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setErr("Enter a valid email address.");
      focusAndScroll(emailRef.current);
      return false;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      focusAndScroll(passwordRef.current);
      return false;
    }
    if (accountType === "SHELTER" && !shelterOrgName.trim()) {
      setErr("Shelter / rescue name is required.");
      focusAndScroll(shelterOrgRef.current);
      return false;
    }
    return true;
  }

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
  ]);

  function onAvatarChange(f: File | null) {
    setAvatarFile(f);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!validateBeforeSubmit() || !payload) {
      return;
    }
    try {
      const result = await register(payload, avatarFile);
      if (result.kind === "needsVerification") {
        nav(`/login?pendingVerification=1&email=${encodeURIComponent(result.email)}`);
        return;
      }
      if (payload.accountType === "SHELTER") nav("/adopt/shelter");
      else if (payload.accountType === "CAT_OWNER") nav("/cats");
      else nav("/adopt");
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : "Register failed";
      setErr(msg);
      focusFromServerError(msg);
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
          padding: "0.75rem 1rem",
          background: "#f8f4ef",
          borderRadius: "12px",
          fontSize: "0.85rem",
          color: "var(--color-muted)",
        }}
      >
        <strong style={{ color: "var(--color-text)" }}>Admin access</strong> is not available here; admin accounts are seeded
        for demos only.
      </div>

      <form noValidate onSubmit={onSubmit} className="ph-grid" style={{ gap: "1.25rem" }}>
        <div ref={accountSectionRef}>
        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend className="ph-label" style={{ marginBottom: "0.75rem" }}>
            I am joining as…
          </legend>
          <div className="ph-account-types">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={"ph-account-type" + (accountType === t.id ? " selected" : "")}
                onClick={() => setAccountType(t.id)}
                aria-pressed={accountType === t.id}
              >
                <span className="ph-account-type-icon" aria-hidden>
                  {t.icon}
                </span>
                <span className="ph-account-type-body">
                  <span className="ph-account-type-title">{t.title}</span>
                  <span className="ph-account-type-desc">{t.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        </div>

        <div>
          <span className="ph-label">Display name</span>
          <input
            ref={displayNameRef}
            className="ph-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <span className="ph-label">Email</span>
          <input
            ref={emailRef}
            className="ph-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
          />
        </div>
        <div>
          <span className="ph-label">Password (min 6)</span>
          <input
            ref={passwordRef}
            className="ph-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={6}
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

        {accountType === "SHELTER" && (
          <div
            className="ph-surface"
            style={{ padding: "1.25rem", background: "#faf8f5", border: "1px dashed var(--color-border)" }}
          >
            <strong style={{ display: "block", marginBottom: "0.85rem", fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
              Organization details
            </strong>
            <div className="ph-grid" style={{ gap: "0.85rem" }}>
              <div>
                <span className="ph-label">Shelter / rescue name *</span>
                <input
                  ref={shelterOrgRef}
                  className="ph-input"
                  value={shelterOrgName}
                  onChange={(e) => setShelterOrgName(e.target.value)}
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

        <button className="ph-btn ph-btn-primary" type="submit" style={{ width: "100%", padding: "0.75rem" }}>
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
