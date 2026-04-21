import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Camera, Cat, ChevronRight, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCatSanctuaryStore } from "../cats/useCatSanctuaryStore";
import { useVetStore } from "../store/useVetStore";
import "../pawvet/pawvet.css";

type Step = 1 | 2 | 3 | 4;

export function FileCase() {
  const nav = useNavigate();
  const { user } = useAuth();
  const cats = useCatSanctuaryStore((s) => s.cats);
  const fetchCats = useCatSanctuaryStore((s) => s.fetchCats);
  const fileCase = useVetStore((s) => s.fileCase);

  const [step, setStep] = useState<Step>(1);
  const [catId, setCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [mediaNote, setMediaNote] = useState("");
  const [urgency, setUrgency] = useState<"routine" | "soon" | "urgent">("routine");
  const [filesLabel, setFilesLabel] = useState("");

  useEffect(() => {
    void fetchCats();
  }, [fetchCats]);

  const [verifiedVetNames, setVerifiedVetNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/pawvet/verified-vet-names");
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

  function catLabel() {
    if (catId == null) return catName.trim() || "Your cat";
    const c = cats.find((x) => x.id === catId);
    return c?.name ?? (catName.trim() || "Your cat");
  }

  function next() {
    if (step === 1 && !catId && !catName.trim()) return;
    if (step === 2 && !symptoms.trim()) return;
    setStep((s) => Math.min(4, (s + 1) as Step) as Step);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const c = fileCase({
      ownerUserId: user.userId,
      catId,
      catName: catLabel(),
      symptoms: symptoms.trim(),
      mediaDescription: [mediaNote.trim(), filesLabel && `Attachments: ${filesLabel}`].filter(Boolean).join("\n"),
      urgency,
    });
    setStep(4);
    window.setTimeout(() => nav(`/pawvet/case/${c.id}`), 2400);
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
                        <input type="radio" name="cat" checked={catId === c.id} onChange={() => { setCatId(c.id); setCatName(c.name); }} />
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        <span style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>{c.breed ?? "Mixed"}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>No cats in sanctuary yet — enter a name below.</p>
                )}
                <label style={{ display: "block", marginTop: "0.5rem" }}>
                  <span className="ph-label">Or type cat name</span>
                  <input className="ph-input" value={catName} onChange={(e) => { setCatName(e.target.value); if (e.target.value) setCatId(null); }} placeholder="e.g. Miso" style={{ width: "100%" }} />
                </label>
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
                  PawVet stores attachment metadata in this demo. Describe what you would upload; full media pipeline can
                  connect to your backend later.
                </p>
                <label>
                  <span className="ph-label">What you would attach</span>
                  <textarea
                    className="ph-textarea"
                    rows={3}
                    value={mediaNote}
                    onChange={(e) => setMediaNote(e.target.value)}
                    placeholder="e.g. 2 photos of left eye discharge, 10s video of breathing"
                    style={{ width: "100%", marginBottom: "0.75rem" }}
                  />
                </label>
                <label>
                  <span className="ph-label">Optional file names (comma-separated)</span>
                  <input className="ph-input" value={filesLabel} onChange={(e) => setFilesLabel(e.target.value)} style={{ width: "100%" }} placeholder="img1.jpg, video1.mp4" />
                </label>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.25rem", gap: "0.75rem" }}>
              {step > 1 ? (
                <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}>
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
                <button type="submit" className="ph-btn ph-btn-primary">
                  Submit case
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
              Your case is live on the triage board. A verified veterinarian can claim it at any time — opening your
              private consultation room…
            </p>
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
