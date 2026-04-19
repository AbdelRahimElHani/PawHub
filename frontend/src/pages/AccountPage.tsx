import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const TYPE_LABEL: Record<string, string> = {
  ADOPTER: "Adopter / explorer",
  CAT_OWNER: "Cat owner",
  SHELTER: "Shelter / rescue",
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
    <div className="ph-surface" style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem" }}>
      <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Your account</h2>
      <p style={{ color: "var(--color-muted)", marginBottom: "1rem" }}>
        Account type: <strong>{TYPE_LABEL[user.accountType] ?? user.accountType}</strong>
        {user.role === "ADMIN" && (
          <>
            {" "}
            · <strong>Administrator</strong>
          </>
        )}
      </p>
      <p style={{ fontSize: "0.88rem", color: "var(--color-muted)", marginBottom: "1rem" }}>
        Your user ID: <strong style={{ color: "var(--color-primary-dark)" }}>{user.userId}</strong> — others can start a DM with you from{" "}
        <Link to="/messages">Messages</Link> using this number.
      </p>

      <div style={{ marginBottom: "1.25rem" }}>
        <span className="ph-label">Profile photo</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="ph-avatar-preview" />
          ) : (
            <div className="ph-avatar-preview" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "var(--color-muted)", padding: "0.5rem", textAlign: "center" }}>
              No photo
            </div>
          )}
          <input type="file" accept="image/*" onChange={(e) => void onAvatar(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      <form onSubmit={onSave} className="ph-grid" style={{ gap: "0.85rem" }}>
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
        {msg && <p style={{ color: "var(--color-primary-dark)" }}>{msg}</p>}
        {err && <p style={{ color: "#b42318" }}>{err}</p>}
        <button className="ph-btn ph-btn-primary" type="submit">
          Save profile
        </button>
      </form>
    </div>
  );
}
