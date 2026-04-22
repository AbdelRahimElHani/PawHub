import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { userInitials } from "../shell/userDisplay";

const TYPE_LABEL: Record<string, string> = {
  ADOPTER: "Adopter / explorer",
  CAT_OWNER: "Cat owner",
  SHELTER: "Shelter / rescue",
  VET: "Veterinarian (PawVet)",
};

export function AccountPage() {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [profileCity, setProfileCity] = useState(user?.profileCity ?? "");
  const [profileRegion, setProfileRegion] = useState(user?.profileRegion ?? "");
  const [profileBio, setProfileBio] = useState(user?.profileBio ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setProfileCity(user.profileCity ?? "");
    setProfileRegion(user.profileRegion ?? "");
    setProfileBio(user.profileBio ?? "");
  }, [user]);

  if (!user) return null;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        profileCity: profileCity.trim() || null,
        profileRegion: profileRegion.trim() || null,
        profileBio: profileBio.trim() || null,
      });
      setMsg("Profile saved.");
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Save failed");
    }
  }

  async function onAvatar(f: File | null) {
    if (!f) return;
    setErr(null);
    setMsg(null);
    try {
      await uploadAvatar(f);
      setMsg("Photo updated.");
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
    }
  }

  return (
    <div className="ph-account-page">
      <div className="ph-account-card">
        <div className="ph-account-hero">
          <div className="ph-account-hero-avatar-wrap">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="ph-account-avatar-lg" width={104} height={104} />
            ) : (
              <div className="ph-account-avatar-lg ph-account-avatar-lg--placeholder" role="img" aria-label="Default profile picture">
                {user.displayName?.trim() ? (
                  <span className="ph-account-avatar-lg-initials">{userInitials(user.displayName)}</span>
                ) : (
                  <UserRound size={44} strokeWidth={1.75} />
                )}
              </div>
            )}
          </div>
          <div className="ph-account-hero-text">
            <h1 className="ph-account-title">{user.displayName || "Your profile"}</h1>
            <p className="ph-account-sub">
              {TYPE_LABEL[user.accountType] ?? user.accountType}
              {user.role === "ADMIN" ? " · Administrator" : ""}
            </p>
          </div>
        </div>

        <div className="ph-account-body">
          <p className="ph-account-meta">
            Your user ID: <strong>{user.userId}</strong> — others can start a DM with you from{" "}
            <Link to="/messages">Messages</Link> using this number.
          </p>

          {user.accountType === "VET" && user.vetVerificationStatus ? (
            <p
              className="ph-account-meta"
              style={{
                marginTop: "0.65rem",
                padding: "0.65rem 0.75rem",
                borderRadius: 10,
                background:
                  user.vetVerificationStatus === "APPROVED"
                    ? "#ecfdf5"
                    : user.vetVerificationStatus === "REJECTED"
                      ? "#fef2f2"
                      : "#fffbeb",
                border: "1px solid var(--color-border)",
              }}
            >
              <strong>PawVet credentials:</strong>{" "}
              {user.vetVerificationStatus === "PENDING" &&
                "Pending review — check your email for an interview invite; you cannot claim PawVet cases until approved."}
              {user.vetVerificationStatus === "APPROVED" && "Approved — you can use the vet dashboard to claim cases."}
              {user.vetVerificationStatus === "REJECTED" && (
                <>
                  Not approved.
                  {user.vetRejectionReason ? (
                    <>
                      {" "}
                      Reason: <em>{user.vetRejectionReason}</em>
                    </>
                  ) : null}
                </>
              )}{" "}
              <Link to="/vet" style={{ fontWeight: 600 }}>
                Vet dashboard
              </Link>
            </p>
          ) : null}

          <div className="ph-account-section">
            <span className="ph-label">Profile photo</span>
            <div className="ph-account-photo-row">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="ph-avatar-preview" />
              ) : (
                <div className="ph-avatar-preview ph-account-avatar-lg--placeholder" style={{ width: 96, height: 96 }} aria-hidden>
                  {user.displayName?.trim() ? (
                    <span className="ph-account-avatar-lg-initials" style={{ fontSize: "1.75rem" }}>
                      {userInitials(user.displayName)}
                    </span>
                  ) : (
                    <UserRound size={40} strokeWidth={1.75} />
                  )}
                </div>
              )}
              <label className="ph-account-file">
                <span className="ph-account-file-btn">Upload a new photo</span>
                <input type="file" accept="image/*" onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          <form onSubmit={onSave} className="ph-grid" style={{ gap: "0.85rem" }}>
            {msg ? (
              <p className="ph-account-alert ph-account-alert--ok" role="status">
                {msg}
              </p>
            ) : null}
            {err ? (
              <p className="ph-account-alert ph-account-alert--err" role="alert">
                {err}
              </p>
            ) : null}
            <div>
              <span className="ph-label">Display name</span>
              <input className="ph-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div>
              <span className="ph-label">City & region</span>
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
                  placeholder="Region"
                  value={profileRegion}
                  onChange={(e) => setProfileRegion(e.target.value)}
                  style={{ flex: 1, minWidth: 120 }}
                />
              </div>
            </div>
            <div>
              <span className="ph-label">Bio</span>
              <textarea className="ph-textarea" rows={4} value={profileBio} onChange={(e) => setProfileBio(e.target.value)} />
            </div>
            <button className="ph-btn ph-btn-primary" type="submit">
              Save profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
