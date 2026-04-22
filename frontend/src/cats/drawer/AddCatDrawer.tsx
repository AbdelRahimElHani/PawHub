import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import type { CatVibe, CatVisionProfile, ColorPalette } from "../catTypes";
import { defaultPaletteForVibe, VIBE_OPTIONS } from "../catTypes";
import { extractPaletteFromImageSource } from "./useColorExtract";
import { useCatSanctuaryStore } from "../useCatSanctuaryStore";

type Props = {
  onClose: () => void;
};

export function AddCatDrawer({ onClose }: Props) {
  const nav = useNavigate();
  const addCat = useCatSanctuaryStore((s) => s.addCat);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [birthday, setBirthday] = useState("");
  const [vibe, setVibe] = useState<CatVibe>("calm");
  const [palette, setPalette] = useState<ColorPalette>(() => defaultPaletteForVibe("calm"));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [visionProfile, setVisionProfile] = useState<CatVisionProfile | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);

  const onFile = useCallback(async (f: File | null) => {
    setFile(f);
    setLocalErr(null);
    setVisionProfile(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setPreview(null);
      setPalette(defaultPaletteForVibe(vibe));
      return;
    }
    const url = URL.createObjectURL(f);
    setPreview(url);
    setVisionLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const v = await api<CatVisionProfile>("/api/cats/vision-profile", { method: "POST", body: fd });
      setVisionProfile(v);
      setPalette({
        primary: v.primaryCoatHex,
        accent: v.secondaryCoatHex,
      });
    } catch {
      try {
        const p = await extractPaletteFromImageSource(url);
        setPalette(p);
      } catch {
        /* keep previous palette */
      }
    } finally {
      setVisionLoading(false);
    }
  }, [preview, vibe]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith("image/")) void onFile(f);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setLocalErr("Name is required.");
      return;
    }
    setSubmitting(true);
    setLocalErr(null);
    try {
      const newId = await addCat({
        name: name.trim(),
        breed: breed.trim(),
        birthday,
        vibe,
        colorPalette: palette,
        photoFile: file,
        visionProfile: visionProfile ?? undefined,
      });
      if (preview) URL.revokeObjectURL(preview);
      onClose();
      nav(`/cats/${newId}`);
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSubmitting(false);
    }
  }

  const dropHint = visionLoading ? "AI profiling photo…" : "Drop a photo or tap to browse";

  return (
    <motion.div
      className="cats-drawer-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="cats-drawer-panel"
        initial={{ y: 48, opacity: 0.92 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cats-drawer-head">
          <h2>Add a cat</h2>
          <button type="button" className="cats-drawer-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="cats-form-grid" onSubmit={onSubmit}>
          <div
            className={`cats-dropzone ${drag ? "cats-dropzone--active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById("cats-file")?.click()}
            role="presentation"
          >
            <input
              id="cats-file"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <div className="cats-dropzone-preview">
                <img src={preview} alt="" />
              </div>
            ) : (
              <div className="cats-dropzone-preview" style={{ background: "rgba(61,139,122,0.12)" }}>
                <span style={{ fontSize: "2.5rem" }}>📷</span>
              </div>
            )}
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-muted)" }}>{dropHint}</p>
            {visionProfile?.notes ? (
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "var(--color-muted)", fontStyle: "italic" }}>
                {visionProfile.notes}
                {visionProfile.source === "gemini" ? " · AI twin" : ""}
              </p>
            ) : null}
            <div className="cats-palette-dots" style={{ justifyContent: "center", marginTop: "0.5rem" }}>
              <span className="cats-palette-dot" style={{ background: palette.primary }} />
              <span className="cats-palette-dot" style={{ background: palette.accent }} />
            </div>
          </div>

          {localErr && <p className="cats-err">{localErr}</p>}

          <label>
            Name
            <input className="ph-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Luna" />
          </label>
          <label>
            Breed
            <input className="ph-input" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Optional — or use AI guess below" />
          </label>
          {visionProfile?.breedGuess ? (
            <p style={{ margin: "-0.35rem 0 0", fontSize: "0.78rem", color: "var(--color-muted)" }}>
              AI guess: <strong style={{ color: "var(--color-primary-dark)" }}>{visionProfile.breedGuess}</strong>
              {" · "}
              {visionProfile.bodySize} · {visionProfile.coatPattern}
            </p>
          ) : null}
          <label>
            Birthday
            <input className="ph-input" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </label>

          <div>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-primary-dark)" }}>Personality</span>
            <div className="cats-vibe-grid" style={{ marginTop: "0.4rem" }}>
              {VIBE_OPTIONS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`cats-vibe-option ${vibe === v.id ? "cats-vibe-option--on" : ""}`}
                  onClick={() => {
                    setVibe(v.id);
                    if (!file) setPalette(defaultPaletteForVibe(v.id));
                  }}
                >
                  <strong>{v.label}</strong>
                  <span>{v.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="cats-drawer-submit" type="submit" disabled={submitting || visionLoading}>
            {submitting ? "Saving…" : "Save & add to sanctuary"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
