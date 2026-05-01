import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";
import { inferMediaLightboxKind } from "./inferMediaKind";

type LightboxState = { url: string; title?: string } | null;

type MediaLightboxContextValue = {
  openMedia: (url: string, title?: string) => void;
  closeMedia: () => void;
};

const MediaLightboxContext = createContext<MediaLightboxContextValue | null>(null);

export function useMediaLightbox(): MediaLightboxContextValue {
  const ctx = useContext(MediaLightboxContext);
  if (!ctx) {
    throw new Error("useMediaLightbox must be used within MediaLightboxProvider");
  }
  return ctx;
}

export function MediaLightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LightboxState>(null);

  const closeMedia = useCallback(() => setState(null), []);
  const openMedia = useCallback((url: string, title?: string) => {
    if (!url?.trim()) return;
    setState({ url: url.trim(), title });
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMedia();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [state, closeMedia]);

  return (
    <MediaLightboxContext.Provider value={{ openMedia, closeMedia }}>
      {children}
      {state
        ? createPortal(
            <div className="ph-media-lightbox" role="dialog" aria-modal="true" aria-label="Media viewer">
              <button
                type="button"
                className="ph-media-lightbox__backdrop"
                aria-label="Close"
                onClick={closeMedia}
              />
              <div className="ph-media-lightbox__panel">
                <div className="ph-media-lightbox__toolbar">
                  {state.title ? <span className="ph-media-lightbox__title">{state.title}</span> : <span />}
                  <div className="ph-media-lightbox__actions">
                    <a
                      href={state.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ph-media-lightbox__icon-link"
                      title="Open in new tab"
                    >
                      <ExternalLink size={18} aria-hidden />
                    </a>
                    <button type="button" className="ph-media-lightbox__close" onClick={closeMedia} aria-label="Close">
                      <X size={22} aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="ph-media-lightbox__body">
                  <MediaLightboxContent url={state.url} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </MediaLightboxContext.Provider>
  );
}

function MediaLightboxContent({ url }: { url: string }) {
  const kind = inferMediaLightboxKind(url);

  if (kind === "image") {
    return <img src={url} alt="" className="ph-media-lightbox__img" />;
  }

  if (kind === "video") {
    return <video src={url} controls playsInline className="ph-media-lightbox__video" />;
  }

  if (kind === "pdf") {
    return <iframe title="PDF" src={url} className="ph-media-lightbox__iframe" />;
  }

  return (
    <div className="ph-media-lightbox__fallback">
      <p>Preview isn’t available for this file type.</p>
      <a className="ph-btn ph-btn-primary" href={url} target="_blank" rel="noopener noreferrer">
        Open or download
      </a>
    </div>
  );
}
