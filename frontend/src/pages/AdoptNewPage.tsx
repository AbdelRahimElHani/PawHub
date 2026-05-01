import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Upload } from "lucide-react";
import { api, apiUrl, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { AdoptionListingDto, ShelterDto } from "../types";
import {
  CatCheckVerificationBanners,
  type CatCheckUiState,
  CAT_CHECK_COPY_ADOPT_IMAGE,
  CAT_CHECK_COPY_ADOPT_MATCH,
} from "../components/catCheck/CatCheckVerificationBanners";
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [catCheck, setCatCheck] = useState<CatCheckUiState>({ state: "idle" });
  const [alignPhase, setAlignPhase] = useState<"idle" | "matching" | "failed">("idle");
  const [alignReason, setAlignReason] = useState<string | null>(null);

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
    user?.accountType === "SHELTER" && shelter?.status === "APPROVED" && !user?.pawAdoptBanned;

  const runImageCatCheck = useCallback(async (file: File) => {
    setCatCheck({ state: "checking" });
    try {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(apiUrl("/api/adopt/cat-check-image"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        setCatCheck({
          state: "unavailable",
          message:
            "Live preview couldn’t run. Your photo is still verified when you upload (if AI is enabled on the server).",
        });
        return;
      }
      const data = (await res.json()) as { isCatRelated: boolean; reason: string };
      if (data.reason?.toLowerCase().includes("skipped")) {
        setCatCheck({ state: "skipped" });
      } else if (data.isCatRelated) {
        setCatCheck({ state: "passed", reason: data.reason });
      } else {
        setCatCheck({ state: "failed", reason: data.reason });
      }
    } catch {
      setCatCheck({
        state: "unavailable",
        message:
          "Live preview couldn’t run. Your photo is still verified when you upload (if AI is enabled on the server).",
      });
    }
  }, []);

  useEffect(() => {
    const file = fileRef.current?.files?.[0];
    if (!file || !previewUrl) return;
    const id = window.setTimeout(() => {
      void runImageCatCheck(file);
    }, 650);
    return () => window.clearTimeout(id);
  }, [previewUrl, runImageCatCheck]);

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      setCatCheck({ state: "idle" });
      setAlignPhase("idle");
      setAlignReason(null);
      return;
    }
    setCatCheck({ state: "checking" });
    setPreviewUrl(URL.createObjectURL(file));
    setAlignPhase("idle");
    setAlignReason(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canPublish) return;
    if (catCheck.state === "failed") return;

    const file = fileRef.current?.files?.[0];

    setErr(null);
    setBusy(true);
    setAlignPhase("idle");
    setAlignReason(null);

    try {
      if (file) {
        setAlignPhase("matching");
        const token = getToken();
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", title);
        fd.append("petName", petName.trim());
        fd.append("description", description.trim());
        fd.append("breed", breed.trim());
        const ageNum = age.trim() ? Math.floor(Number(age)) : NaN;
        if (Number.isFinite(ageNum) && ageNum >= 0) fd.append("ageMonths", String(ageNum));

        const matchRes = await fetch(apiUrl("/api/adopt/cat-check-match"), {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        setAlignPhase("idle");

        if (matchRes.ok) {
          const matchData = (await matchRes.json()) as { isCatRelated: boolean; reason: string };
          const skipped = matchData.reason?.toLowerCase().includes("skipped");
          if (!skipped && !matchData.isCatRelated) {
            setAlignPhase("failed");
            setAlignReason(matchData.reason);
            setErr("Your headline, story, and photo couldn’t be verified to match. Update the fields or choose another photo.");
            setBusy(false);
            return;
          }
        }
        /* If match endpoint errors, server upload still enforces — continue */
      }

      const ageMonths =
        age.trim() && Number.isFinite(Math.floor(Number(age))) ? Math.floor(Number(age)) : null;

      const created = await api<AdoptionListingDto>("/api/adopt/listings", {
        method: "POST",
        body: JSON.stringify({
          title,
          petName: petName || null,
          description: description || null,
          breed: breed || null,
          ageMonths,
        }),
      });
      const listingId = created.id;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const token = getToken();
        const photoRes = await fetch(apiUrl(`/api/adopt/listings/${listingId}/photo`), {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (photoRes.status === 422) {
          const json = (await photoRes.json().catch(() => ({}))) as { error?: string; reason?: string };
          setCatCheck({
            state: "failed",
            reason: json.reason ?? "This photo doesn’t pass AI verification for Paw Adopt.",
          });
          setErr(json.reason ?? "Photo verification failed. Nothing else was changed—you can fix the image and try again.");
          nav(`/adopt/${listingId}`);
          return;
        }
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
      setAlignPhase("idle");
    }
  }

  const canSubmit =
    canPublish &&
    catCheck.state !== "failed" &&
    catCheck.state !== "checking" &&
    alignPhase !== "matching" &&
    !busy;

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
            Paw Adopt listings can only be published by organizations registered as a <strong>shelter</strong> and verified
            by an admin. Individual accounts can still browse, save cats, and message shelters.
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
          <h2>Connect your shelter profile</h2>
          <p>
            We couldn’t load a shelter profile for this account yet. Open <strong>Shelter & verification</strong> to
            create your workspace and complete the dossier (questionnaire + document uploads).
          </p>
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
            Thanks for registering <strong>{shelter.name}</strong>. Finish your dossier if you haven’t yet, then wait for
            an admin to verify your shelter. Until then, listings stay locked so adopters only see trusted partners.
          </p>
          <Link className="ph-btn ph-btn-primary" to="/adopt/shelter">
            Shelter workspace
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
          <p>
            This shelter application wasn’t approved, so new listings stay locked. Open your shelter workspace to read
            the reviewer note and use your one-time appeal if you’d like the decision reconsidered.
          </p>
          <Link className="ph-btn ph-btn-primary" to="/adopt/shelter">
            Open shelter workspace
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
        <strong>Step 1</strong> — When you choose a hero photo, we scan it with the same Gemini Cat-Check as Paw Market
        (tuned for <em>real cats</em>). <strong>Step 2</strong> — When you publish with a photo, we verify your headline
        and story match that photo.
      </p>
      {user?.pawAdoptBanned ? (
        <p
          role="alert"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 12,
            background: "color-mix(in srgb, #b42318 12%, transparent)",
            border: "1px solid color-mix(in srgb, #b42318 35%, transparent)",
            fontSize: "0.92rem",
            lineHeight: 1.5,
          }}
        >
          Your account cannot publish new adoption listings on Paw Adopt. If you think this is a mistake, contact support
          through your shelter workspace or reply to your moderation notifications.
        </p>
      ) : null}
      <p style={{ marginBottom: "1rem", fontSize: "0.92rem" }}>
        <Link to="/adopt/my-listings" style={{ fontWeight: 600 }}>
          My listings
        </Link>
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="ph-grid">
        <label>
          Headline
          <input
            className="ph-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={4}
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
            required
            minLength={30}
            placeholder="Personality, medical notes, what a great home looks like… (at least a few sentences)"
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

        <div>
          <span className="ph-label" style={{ display: "block", marginBottom: "0.5rem" }}>
            Hero photo <span style={{ fontWeight: 400, color: "var(--color-muted)" }}> — optional; AI verifies when present</span>
          </span>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: previewUrl ? 0 : "1.5rem",
              border: `2px ${
                catCheck.state === "failed"
                  ? "solid #fca5a5"
                  : catCheck.state === "passed"
                    ? "solid #6ee7b7"
                    : "dashed var(--color-border)"
              }`,
              borderRadius: 12,
              cursor: "pointer",
              background: "#fafaf9",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
            ) : (
              <>
                <Upload size={22} color="var(--color-muted)" />
                <span style={{ fontSize: "0.88rem", color: "var(--color-muted)", textAlign: "center" }}>
                  Click to upload — AI scans for a real cat (same engine as Paw Market)
                </span>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            {previewUrl ? (
              <CatCheckVerificationBanners catCheck={catCheck} copy={CAT_CHECK_COPY_ADOPT_IMAGE} variant="onImage" />
            ) : null}
          </label>
        </div>

        {err && <div style={{ color: "#b42318", fontSize: "0.95rem" }}>{err}</div>}

        {alignPhase === "matching" && (
          <div className="pm-ai-banner" style={{ marginTop: "0.2rem" }}>
            <span className="pm-paw-spin">🐾</span>
            <div>
              <strong style={{ fontSize: "0.9rem" }}>{CAT_CHECK_COPY_ADOPT_MATCH.checkingTitle}</strong>
              <p style={{ margin: "0.1rem 0 0", fontSize: "0.82rem", color: "var(--color-muted)" }}>
                {CAT_CHECK_COPY_ADOPT_MATCH.checkingSub}
              </p>
            </div>
          </div>
        )}

        {alignPhase === "failed" && alignReason ? (
          <div
            style={{
              background: "#fff1f0",
              border: "1.5px solid #fca5a5",
              borderRadius: 10,
              padding: "0.75rem 1rem",
              fontSize: "0.85rem",
              color: "#7f1d1d",
            }}
          >
            <strong>Step 2:</strong> {alignReason}
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
          <button className="ph-btn ph-btn-primary" type="submit" disabled={!canSubmit}>
            {catCheck.state === "checking" ? (
              <>
                <span className="pm-paw-spin" style={{ fontSize: "1rem" }}>
                  🐾
                </span>{" "}
                Scanning image…
              </>
            ) : alignPhase === "matching" ? (
              <>
                <span className="pm-paw-spin" style={{ fontSize: "1rem" }}>
                  🐾
                </span>{" "}
                Verifying match…
              </>
            ) : catCheck.state === "failed" ? (
              "Fix the photo first"
            ) : busy ? (
              "Publishing…"
            ) : (
              "Publish listing"
            )}
          </button>
          <button type="button" className="ph-btn ph-btn-ghost" onClick={() => fileRef.current?.click()}>
            {previewUrl ? "Change photo" : "Add photo"}
          </button>
          <Link className="ph-btn ph-btn-ghost" to="/adopt">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
