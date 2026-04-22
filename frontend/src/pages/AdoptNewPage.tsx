import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { api, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { AdoptionListingDto, ShelterDto } from "../types";
import "../adopt/adopt.css";

export function AdoptNewPage() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [shelter, setShelter] = useState<ShelterDto | null | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [petName, setPetName] = useState("");
  const [description, setDescription] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setShelter(null);
      return;
    }
    void api<ShelterDto | null>("/api/adopt/shelters/mine")
      .then((s) => setShelter(s))
      .catch(() => setShelter(null));
  }, [user]);

  const canPublish =
    user?.accountType === "SHELTER" && shelter?.status === "APPROVED";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canPublish) return;
    setErr(null);
    setBusy(true);
    try {
      const created = await api<AdoptionListingDto>("/api/adopt/listings", {
        method: "POST",
        body: JSON.stringify({
          title,
          petName: petName || null,
          description: description || null,
          breed: breed || null,
          ageMonths: age ? Number(age) : null,
        }),
      });
      const listingId = created.id;
      if (photo) {
        const fd = new FormData();
        fd.append("file", photo);
        const token = getToken();
        const photoRes = await fetch(`/api/adopt/listings/${listingId}/photo`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!photoRes.ok) {
          let msg = "Listing was created, but the photo upload failed. You can try again from the listing page.";
          try {
            const j = (await photoRes.json()) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            /* ignore */
          }
          setErr(msg);
          nav(`/adopt/${listingId}`);
          return;
        }
      }
      nav(`/adopt/${listingId}`);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || (user && shelter === undefined)) {
    return (
      <div className="adopt-form-shell">
        <p style={{ color: "var(--color-muted)" }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="adopt-form-shell">
        <div className="adopt-gate">
          <h2>Sign in to publish</h2>
          <p>Adoption listings are managed by verified shelter accounts. Sign in to continue.</p>
          <Link className="ph-btn ph-btn-primary" to={`/login?next=${encodeURIComponent("/adopt/new")}`}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (user.accountType !== "SHELTER") {
    return (
      <div className="adopt-form-shell">
        <div className="adopt-gate">
          <h2>Shelter accounts only</h2>
          <p>
            Paw Adopt listings can only be published by organizations registered as a <strong>shelter</strong> and
            verified by an admin. Individual accounts can still browse, save cats, and message shelters.
          </p>
          <Link className="ph-btn ph-btn-primary" to="/register">
            Create a shelter account
          </Link>
        </div>
      </div>
    );
  }

  if (!shelter) {
    return (
      <div className="adopt-form-shell">
        <div className="adopt-gate">
          <h2>Complete your shelter profile</h2>
          <p>We couldn’t find a shelter record for your account. Review your shelter details to continue.</p>
          <Link className="ph-btn ph-btn-primary" to="/adopt/shelter">
            Shelter & verification
          </Link>
        </div>
      </div>
    );
  }

  if (shelter.status === "PENDING") {
    return (
      <div className="adopt-form-shell">
        <div className="adopt-gate">
          <BadgeCheck size={28} strokeWidth={2} aria-hidden style={{ color: "#d4a012", marginBottom: "0.5rem" }} />
          <h2>Awaiting verification</h2>
          <p>
            Thanks for registering <strong>{shelter.name}</strong>. An admin will verify your shelter profile; until
            then, listings stay locked so adopters only see trusted partners.
          </p>
          <Link className="ph-btn ph-btn-ghost" to="/adopt/shelter">
            View status
          </Link>
        </div>
      </div>
    );
  }

  if (shelter.status === "REJECTED") {
    return (
      <div className="adopt-form-shell">
        <div className="adopt-gate">
          <h2>Verification needed</h2>
          <p>This shelter application wasn’t approved, so new listings cannot be published.</p>
          <Link className="ph-btn ph-btn-ghost" to="/adopt/shelter">
            Shelter details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-surface adopt-form-shell" style={{ borderRadius: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
        <BadgeCheck size={20} strokeWidth={2} aria-hidden style={{ color: "#2d6a4f" }} />
        <span style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", color: "#2d6a4f" }}>
          Verified shelter
        </span>
      </div>
      <h1>List a cat for adoption</h1>
      <p className="adopt-form-lede">
        Tell adopters the story first—warm, honest copy helps cats move to the right home. You can add a hero photo
        right away or from the listing page later.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="ph-grid">
        <label>
          Headline
          <input
            className="ph-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Gentle senior seeks quiet sunbeams"
          />
        </label>
        <label>
          Cat’s name
          <input className="ph-input" value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="Optional" />
        </label>
        <label>
          Story & details
          <textarea
            className="ph-textarea"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Personality, medical notes, what a great home looks like…"
          />
        </label>
        <label>
          Breed (best guess)
          <input className="ph-input" value={breed} onChange={(e) => setBreed(e.target.value)} />
        </label>
        <label>
          Age in months
          <input className="ph-input" type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} />
        </label>
        <label>
          Hero photo (optional)
          <input className="ph-input" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        {err && <div style={{ color: "#b42318", fontSize: "0.95rem" }}>{err}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
          <button className="ph-btn ph-btn-primary" type="submit" disabled={busy || !canPublish}>
            {busy ? "Publishing…" : "Publish listing"}
          </button>
          <Link className="ph-btn ph-btn-ghost" to="/adopt">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
