import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { ShelterDto } from "../types";

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

  useEffect(() => {
    void (async () => {
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
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      if (existing) {
        setMsg("You already have a shelter application. Status: " + existing.status);
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
      setMsg("Application submitted. An admin must approve before you can post adoption listings.");
      const s = await api<ShelterDto | null>("/api/adopt/shelters/mine");
      setExisting(s);
    } catch (ex: unknown) {
      setMsg(ex instanceof Error ? ex.message : "Failed");
    }
  }

  if (!loaded) return <p>Loading…</p>;

  return (
    <div className="ph-surface" style={{ maxWidth: 520, margin: "0 auto", padding: "1.25rem" }}>
      <h2 style={{ marginTop: 0 }}>Shelter profile</h2>
      {user?.accountType === "SHELTER" && (
        <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
          If you registered as a shelter, your organization was created at sign-up. You can review status and details here — you do not need to submit a second application.
        </p>
      )}
      {existing && (
        <p style={{ color: "var(--color-muted)" }}>
          Status: <strong>{existing.status}</strong>
        </p>
      )}
      {msg && <p>{msg}</p>}
      {!existing ? (
        <form onSubmit={onSubmit} className="ph-grid">
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
            Submit application
          </button>
        </form>
      ) : (
        <p style={{ color: "var(--color-muted)" }}>Shelter record exists; edits are out of scope for this demo build.</p>
      )}
    </div>
  );
}
