import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Camera, Cat, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { type ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiUrl, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { isAdminAccount, isVeterinarianAccount } from "../auth/vetAccess";
import { useCatSanctuaryStore } from "../cats/useCatSanctuaryStore";
import type { CaseAttachment, CatCaseSnapshot } from "../store/useVetStore";
import { useVetStore } from "../store/useVetStore";
import type { PawvetTriageCaseDto } from "../types/pawvetTriage";
import "../pawvet/pawvet.css";

type Step = 1 | 2 | 3 | 4;

const MAX_CASE_ATTACHMENTS = 5;
/** Per file — larger uploads may fail to persist if the browser storage quota is exceeded. */
const MAX_CASE_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const MAX_CASE_ATTACHMENT_MB = Math.round(MAX_CASE_ATTACHMENT_BYTES / (1024 * 1024));

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff", ".avif", ".heic", ".heif"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv", ".wmv", ".3gp"]);

/** Windows / some cameras leave `file.type` empty or `application/octet-stream` — infer from extension. */
function inferMediaKind(file: File): "image" | "video" | null {
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot) : "";
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  return null;
}

function mimeForStorage(file: File, kind: "image" | "video"): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  return kind === "video" ? "video/mp4" : "image/jpeg";
}

function formatAgeMonths(m: number | null | undefined): string {
  if (m == null) return "—";
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return mo ? `${y} yr ${mo} mo` : `${y} yr`;
}

function readOneFile(file: File): Promise<string | null> {
  if (file.size > MAX_CASE_ATTACHMENT_BYTES) return Promise.resolve(null);
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

export function FileCase() {
  const nav = useNavigate();
  const { user } = useAuth();
  const cats = useCatSanctuaryStore((s) => s.cats);
  const fetchCats = useCatSanctuaryStore((s) => s.fetchCats);
  const mergeCasesFromApi = useVetStore((s) => s.mergeCasesFromApi);
  const cases = useVetStore((s) => s.cases);

  const [step, setStep] = useState<Step>(1);
  /** After submit: stay on “Waiting for a vet” until this case is claimed (`IN_PROGRESS`), then navigate. */
  const [awaitClaimCaseId, setAwaitClaimCaseId] = useState<string | null>(null);
  const [catId, setCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState("");
  const [manualBreed, setManualBreed] = useState("");
  const [manualAgeMonths, setManualAgeMonths] = useState("");
  const [manualGender, setManualGender] = useState<"" | "MALE" | "FEMALE">("");
  const [manualBio, setManualBio] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [mediaNote, setMediaNote] = useState("");
  const [urgency, setUrgency] = useState<"routine" | "soon" | "urgent">("routine");
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [attachBusy, setAttachBusy] = useState(false);
  const [attachHint, setAttachHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCats();
  }, [fetchCats]);

  useEffect(() => {
    if (step !== 3) setAttachHint(null);
  }, [step]);

  useEffect(() => {
    if (step !== 4 || !awaitClaimCaseId) return;
    const row = cases.find((x) => x.id === awaitClaimCaseId);
    if (row?.status === "IN_PROGRESS") {
      nav(`/pawvet/case/${awaitClaimCaseId}`);
      setAwaitClaimCaseId(null);
    }
  }, [step, awaitClaimCaseId, cases, nav]);

  const [verifiedVetNames, setVerifiedVetNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/pawvet/verified-vet-names"));
        if (!res.ok) return;
        const data = (await res.json()) as string[];
        if (!cancelled && Array.isArray(data)) setVerifiedVetNames(data);
      } catch {
        /* offline or API unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildCatSnapshot = useCallback((): CatCaseSnapshot => {
    if (catId != null) {
      const c = cats.find((x) => x.id === catId);
      if (c) {
        return {
          source: "sanctuary",
          name: c.name,
          breed: c.breed,
          ageMonths: c.ageMonths,
          gender: c.gender,
          bio: c.bio,
          primaryPhotoUrl: c.photoUrls[0] ?? null,
          birthday: c.birthday ?? null,
        };
      }
    }
    const ageParsed = manualAgeMonths.trim() === "" ? null : Number.parseInt(manualAgeMonths, 10);
    return {
      source: "manual",
      name: catName.trim() || "Your cat",
      breed: manualBreed.trim() || null,
      ageMonths: ageParsed != null && !Number.isNaN(ageParsed) ? Math.max(0, ageParsed) : null,
      gender: manualGender || null,
      bio: manualBio.trim() || null,
      primaryPhotoUrl: null,
      birthday: null,
    };
  }, [catId, cats, catName, manualBreed, manualAgeMonths, manualGender, manualBio]);

  function next() {
    if (step === 1) {
      if (catId == null) {
        if (!catName.trim() || !manualBreed.trim()) return;
      }
    }
    if (step === 2 && !symptoms.trim()) return;
    setStep((s) => Math.min(4, (s + 1) as Step) as Step);
  }

  async function onPickMedia(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    /** Copy before clearing `value` — in Chrome/Edge `input.files` is live and becomes empty when reset. */
    const picked = input.files?.length ? Array.from(input.files) : [];
    input.value = "";
    if (!picked.length) return;
    setAttachHint(null);
    setAttachBusy(true);

    const skipped: string[] = [];
    const readResults: CaseAttachment[] = [];

    for (let i = 0; i < picked.length; i++) {
      if (readResults.length >= MAX_CASE_ATTACHMENTS) break;
      const file = picked[i];
      const kind = inferMediaKind(file);
      if (!kind) {
        skipped.push(`"${file.name}" (not a known photo/video type)`);
        continue;
      }
      if (file.size > MAX_CASE_ATTACHMENT_BYTES) {
        skipped.push(`"${file.name}" (over ${MAX_CASE_ATTACHMENT_MB} MB — try a smaller export)`);
        continue;
      }
      const dataUrl = await readOneFile(file);
      if (!dataUrl) {
        skipped.push(`"${file.name}" (could not read)`);
        continue;
      }
      readResults.push({
        id: `att_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`,
        kind,
        fileName: file.name,
        mimeType: mimeForStorage(file, kind),
        dataUrl,
      });
    }

    setAttachments((prev) => {
      const merged = [...prev];
      for (const r of readResults) {
        if (merged.length >= MAX_CASE_ATTACHMENTS) break;
        merged.push(r);
      }
      return merged;
    });

    const parts: string[] = [];
    if (readResults.length) {
      parts.push(`Added ${readResults.length} file${readResults.length === 1 ? "" : "s"}.`);
    }
    if (skipped.length) {
      parts.push(
        `Skipped: ${skipped.slice(0, 2).join(" · ")}${skipped.length > 2 ? ` (+${skipped.length - 2} more)` : ""}`,
      );
    }
    if (!parts.length) {
      parts.push("No new files were added.");
    }
    setAttachHint(parts.join(" "));

    setAttachBusy(false);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function uploadAttachmentToServer(a: CaseAttachment): Promise<string | null> {
    if (!a.dataUrl) return null;
    const blob = await (await fetch(a.dataUrl)).blob();
    const file = new File([blob], a.fileName, { type: a.mimeType || "application/octet-stream" });
    const fd = new FormData();
    fd.append("file", file);
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(apiUrl("/api/pawvet/triage-cases/media"), { method: "POST", body: fd, headers });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = (await res.json()) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg || "Upload failed");
    }
    const j = (await res.json()) as { url?: string };
    return j.url ?? null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      nav("/login", { state: { from: "/pawvet/file-case" } });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const snap = buildCatSnapshot();
      const urls: string[] = [];
      for (const a of attachments) {
        const url = await uploadAttachmentToServer(a);
        if (url) urls.push(url);
      }
      const mediaDescription = [
        mediaNote.trim(),
        attachments.length && `Uploaded files: ${attachments.map((x) => x.fileName).join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n");
      const payload = {
        catId,
        catName: snap.name,
        catSnapshot: snap as unknown as Record<string, unknown>,
        symptoms: symptoms.trim(),
        mediaDescription,
        urgency,
        attachmentUrls: urls,
      };
      const dto = await api<PawvetTriageCaseDto>("/api/pawvet/triage-cases", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      mergeCasesFromApi([dto]);
      setAwaitClaimCaseId(String(dto.id));
      setStep(4);
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "QuotaExceededError"
          ? "Browser storage is full. Try fewer or smaller photos, or clear site data for this app and try again."
          : err instanceof Error
            ? err.message
            : "Could not save the case.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (user && isAdminAccount(user)) {
    return (
      <div className="pawvet-shell">
        <div className="pawvet-hero" style={{ marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "1.45rem" }}>File a health case</h1>
          <p>Administrator accounts do not file guardian triage cases. Use the PawVet admin hub to review veterinarians and programs.</p>
        </div>
        <div className="pawvet-glass-card" style={{ padding: "1.25rem" }}>
          <Link className="ph-btn ph-btn-primary" to="/pawvet/admin">
            PawVet admin
          </Link>
          <p style={{ margin: "1rem 0 0" }}>
            <Link className="ph-btn ph-btn-ghost" to="/">
              ← Home
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (user && isVeterinarianAccount(user)) {
    return (
      <div className="pawvet-shell">
        <div className="pawvet-hero" style={{ marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "1.45rem" }}>File a health case</h1>
          <p>Veterinarian accounts cannot file guardian triage cases. Use the vet dashboard to assist pet owners after your account is approved.</p>
        </div>
        <div className="pawvet-glass-card" style={{ padding: "1.25rem" }}>
          <Link className="ph-btn ph-btn-primary" to="/vet">
            Vet dashboard
          </Link>
          <p style={{ margin: "1rem 0 0" }}>
            <Link className="ph-btn ph-btn-ghost" to="/pawvet">
              ← PawVet home
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pawvet-shell">
      <div className="pawvet-hero" style={{ marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.45rem" }}>File a health case</h1>
        <p>Step through triage so a verified veterinarian has the context they need.</p>
      </div>

      <div className="pawvet-stepper" aria-label="Progress">
        {([1, 2, 3] as const).map((n) => (
          <span key={n} className={`pawvet-step${step === n ? " pawvet-step--active" : ""}${step > n ? " pawvet-step--done" : ""}`}>
            {n}. {n === 1 ? "Cat" : n === 2 ? "Symptoms" : "Media"}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step < 4 ? (
          <motion.form
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
            onSubmit={step === 3 ? submit : (e) => e.preventDefault()}
            className="pawvet-glass-card"
            style={{ padding: "1.35rem" }}
          >
            {step === 1 && (
              <>
                <h2 style={{ margin: "0 0 0.75rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                  <Cat size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
                  Select your cat
                </h2>
                {cats.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    {cats.map((c) => (
                      <label
                        key={c.id}
                        className="ph-surface"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.65rem",
                          padding: "0.55rem 0.75rem",
                          cursor: "pointer",
                          border: catId === c.id ? "2px solid var(--pawvet-medical)" : "1px solid var(--color-border)",
                        }}
                      >
                        <input
                          type="radio"
                          name="cat"
                          checked={catId === c.id}
                          onChange={() => {
                            setCatId(c.id);
                            setCatName(c.name);
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>{c.breed ?? "Mixed"}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>No cats in My Cats yet — add one in the sanctuary, or describe a cat below.</p>
                )}
                {catId != null ? (
                  (() => {
                    const sel = cats.find((x) => x.id === catId);
                    if (!sel) return null;
                    return (
                      <div
                        className="ph-surface"
                        style={{
                          marginBottom: "0.75rem",
                          padding: "0.75rem",
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "flex-start",
                          border: "1px solid var(--pawvet-medical)",
                          background: "color-mix(in srgb, var(--pawvet-medical) 6%, transparent)",
                        }}
                      >
                        {sel.photoUrls[0] ? (
                          <img
                            src={sel.photoUrls[0]}
                            alt=""
                            style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: "1px solid var(--color-border)" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 72,
                              height: 72,
                              borderRadius: 10,
                              background: "var(--hub-sage-soft)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.75rem",
                            }}
                            aria-hidden
                          >
                            🐱
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "var(--color-primary-dark)" }}>{sel.name}</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginTop: 4, lineHeight: 1.45 }}>
                            <div>Breed: {sel.breed ?? "—"}</div>
                            <div>Age: {formatAgeMonths(sel.ageMonths)}</div>
                            <div>Gender: {sel.gender === "MALE" ? "Male" : sel.gender === "FEMALE" ? "Female" : "—"}</div>
                            {sel.birthday ? <div>Birthday (saved locally): {sel.birthday}</div> : null}
                            {sel.bio ? <div style={{ marginTop: 6 }}>Bio: {sel.bio}</div> : null}
                          </div>
                          <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--color-muted)" }}>
                            These details are copied into your health case for the vet.
                          </p>
                        </div>
                      </div>
                    );
                  })()
                ) : null}
                <label style={{ display: "block", marginTop: catId != null ? "0.25rem" : "0.5rem" }}>
                  <span className="ph-label">{catId != null ? "Change selection — type another name" : "Cat name (required if not choosing from list)"}</span>
                  <input
                    className="ph-input"
                    value={catName}
                    onChange={(e) => {
                      setCatName(e.target.value);
                      if (e.target.value) setCatId(null);
                    }}
                    placeholder="e.g. Miso"
                    style={{ width: "100%" }}
                  />
                </label>
                {catId == null ? (
                  <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed var(--color-border)" }}>
                    <p style={{ margin: "0 0 0.65rem", fontSize: "0.88rem", color: "var(--color-muted)" }}>
                      This cat is not linked to My Cats — add what you know so the vet can triage accurately.
                    </p>
                    <label style={{ display: "block", marginBottom: "0.65rem" }}>
                      <span className="ph-label">Breed or mix (required)</span>
                      <input
                        className="ph-input"
                        value={manualBreed}
                        onChange={(e) => setManualBreed(e.target.value)}
                        placeholder="e.g. Domestic shorthair, Siamese mix…"
                        style={{ width: "100%" }}
                      />
                    </label>
                    <label style={{ display: "block", marginBottom: "0.65rem" }}>
                      <span className="ph-label">Approx. age (months, optional)</span>
                      <input
                        className="ph-input"
                        type="number"
                        min={0}
                        value={manualAgeMonths}
                        onChange={(e) => setManualAgeMonths(e.target.value)}
                        placeholder="e.g. 18"
                        style={{ width: "100%" }}
                      />
                    </label>
                    <label style={{ display: "block", marginBottom: "0.65rem" }}>
                      <span className="ph-label">Sex (optional)</span>
                      <select className="ph-input" value={manualGender} onChange={(e) => setManualGender(e.target.value as "" | "MALE" | "FEMALE")} style={{ width: "100%" }}>
                        <option value="">Prefer not to say</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </label>
                    <label style={{ display: "block" }}>
                      <span className="ph-label">Notes for the vet (optional)</span>
                      <textarea
                        className="ph-textarea"
                        rows={3}
                        value={manualBio}
                        onChange={(e) => setManualBio(e.target.value)}
                        placeholder="Indoor/outdoor, medications, past conditions…"
                        style={{ width: "100%" }}
                      />
                    </label>
                  </div>
                ) : null}
              </>
            )}

            {step === 2 && (
              <>
                <h2 style={{ margin: "0 0 0.75rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                  Describe symptoms
                </h2>
                <label>
                  <span className="ph-label">What is going on?</span>
                  <textarea
                    className="ph-textarea"
                    required
                    rows={6}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Onset, appetite, litter, vomiting, breathing, energy…"
                    style={{ width: "100%" }}
                  />
                </label>
                <div style={{ marginTop: "1rem" }}>
                  <span className="ph-label">Urgency</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.35rem" }}>
                    {(["routine", "soon", "urgent"] as const).map((u) => (
                      <label key={u} className="pm-toggle" style={{ cursor: "pointer" }}>
                        <input type="radio" name="urg" checked={urgency === u} onChange={() => setUrgency(u)} />
                        {u === "routine" ? "Routine" : u === "soon" ? "Soon" : "Urgent"}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 style={{ margin: "0 0 0.75rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
                  <Camera size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
                  Photos / videos
                </h2>
                <p style={{ fontSize: "0.88rem", color: "var(--color-muted)", marginBottom: "0.75rem" }}>
                  Choose photos or short clips (up to {MAX_CASE_ATTACHMENTS} files, up to {MAX_CASE_ATTACHMENT_MB} MB each).
                  When you submit, media is uploaded to PawHub and the case is stored on the server so verified veterinarians
                  can see it on the triage board from any device.
                </p>
                <div style={{ marginBottom: "0.85rem" }}>
                  <input
                    id="pawvet-case-media-input"
                    type="file"
                    accept="image/*,video/*,.heic,.heif"
                    multiple
                    className="ph-input"
                    disabled={attachBusy}
                    onChange={(e) => void onPickMedia(e)}
                    style={{ width: "100%" }}
                  />
                  {attachBusy ? (
                    <p style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginTop: "0.35rem" }}>Reading files…</p>
                  ) : null}
                  {attachHint ? (
                    <p
                      role="status"
                      style={{
                        fontSize: "0.82rem",
                        marginTop: "0.35rem",
                        color: attachHint.includes("Skipped:")
                          ? "#b45309"
                          : attachHint.startsWith("Added")
                            ? "#065f46"
                            : "var(--color-muted)",
                        lineHeight: 1.45,
                      }}
                    >
                      {attachHint}
                    </p>
                  ) : null}
                  <p style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginTop: "0.35rem", marginBottom: 0 }}>
                    {attachments.length} / {MAX_CASE_ATTACHMENTS} attached
                    {attachments.length ? " — thumbnails appear below." : ""}
                  </p>
                </div>
                {attachments.length ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {attachments.map((a) => (
                      <li
                        key={a.id}
                        className="ph-surface"
                        style={{ padding: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
                      >
                        {a.kind === "image" ? (
                          <img
                            src={a.dataUrl ?? ""}
                            alt=""
                            style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--color-border)" }}
                          />
                        ) : (
                          <video
                            src={a.dataUrl ?? ""}
                            style={{ width: 80, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--color-border)" }}
                            muted
                            playsInline
                          />
                        )}
                        <span style={{ fontSize: "0.85rem", flex: 1, minWidth: 120, wordBreak: "break-word" }}>{a.fileName}</span>
                        <button type="button" className="ph-btn ph-btn-ghost" onClick={() => removeAttachment(a.id)} aria-label={`Remove ${a.fileName}`}>
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <label>
                  <span className="ph-label">Context for the vet (optional)</span>
                  <textarea
                    className="ph-textarea"
                    rows={3}
                    value={mediaNote}
                    onChange={(e) => setMediaNote(e.target.value)}
                    placeholder="e.g. Photo 1 is this morning; video shows breathing at rest"
                    style={{ width: "100%", marginBottom: 0 }}
                  />
                </label>
              </>
            )}

            {step === 3 && submitError ? (
              <p role="alert" style={{ marginTop: "1rem", padding: "0.65rem 0.75rem", borderRadius: 8, background: "#fef2f2", color: "#b42318", fontSize: "0.88rem" }}>
                {submitError}
              </p>
            ) : null}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.25rem", gap: "0.75rem" }}>
              {step > 1 ? (
                <button
                  type="button"
                  className="ph-btn ph-btn-ghost"
                  disabled={submitting}
                  onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
                >
                  Back
                </button>
              ) : (
                <Link className="ph-btn ph-btn-ghost" to="/pawvet">
                  Cancel
                </Link>
              )}
              {step < 3 ? (
                <button type="button" className="ph-btn ph-btn-primary" onClick={next}>
                  Continue <ChevronRight size={16} aria-hidden style={{ marginLeft: 4 }} />
                </button>
              ) : (
                <button type="submit" className="ph-btn ph-btn-primary" disabled={submitting}>
                  {submitting ? "Saving…" : "Submit case"}
                </button>
              )}
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="wait"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pawvet-glass-card"
            style={{ padding: "2rem 1.5rem", textAlign: "center" }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
              <span className="pawvet-pulse" aria-hidden />
            </div>
            <Loader2 className="pm-paw-spin" size={28} style={{ color: "var(--pawvet-medical)", marginBottom: "0.75rem" }} />
            <h2 style={{ margin: "0 0 0.5rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
              Waiting for a vet
            </h2>
            <p style={{ margin: "0 auto 1.25rem", maxWidth: "42ch", color: "var(--color-muted)", lineHeight: 1.55 }}>
              Your case is live on the triage board. This screen stays here until a verified veterinarian <strong>accepts</strong>{" "}
              your case — then you&apos;ll be taken to your private consultation room automatically.
            </p>
            {awaitClaimCaseId ? (
              <p style={{ margin: "0 auto 1rem", maxWidth: "42ch", fontSize: "0.85rem", color: "var(--color-muted)" }}>
                Want to open the room while you wait?{" "}
                <Link to={`/pawvet/case/${awaitClaimCaseId}`} style={{ fontWeight: 700, color: "var(--pawvet-medical)" }}>
                  Open case room
                </Link>
              </p>
            ) : null}
            <div style={{ textAlign: "left", maxWidth: 420, margin: "0 auto" }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-muted)", marginBottom: "0.5rem" }}>
                Online verified vets (sample)
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {verifiedVetNames.slice(0, 6).map((name) => (
                  <li key={name} className="ph-surface" style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="pawvet-pulse" style={{ width: 8, height: 8 }} />
                    <span style={{ fontWeight: 600 }}>{name}</span>
                    <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--color-muted)" }}>Verified</span>
                  </li>
                ))}
                {!verifiedVetNames.length && (
                  <li className="ph-surface" style={{ padding: "0.5rem 0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <AlertCircle size={16} color="var(--color-muted)" />
                    <span style={{ color: "var(--color-muted)", fontSize: "0.88rem" }}>Admins can verify vets in the queue.</span>
                  </li>
                )}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
