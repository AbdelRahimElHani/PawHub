import { useCallback, useState } from "react";
import type { ColorPalette } from "../catTypes";

const SAMPLE = 48;

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function deriveAccent(primary: string): string {
  const hex = primary.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    h =
      max === r
        ? ((g - b) / d + (g < b ? 6 : 0)) / 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    h /= 6;
  }
  const nh = (h + 0.12) % 1;
  const nl = Math.min(0.92, l + 0.18);
  const ns = Math.min(0.85, 0.45 + (max - min) * 0.5);
  const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns;
  const p = 2 * nl - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const rr = Math.round(hue2rgb(nh + 1 / 3) * 255);
  const gg = Math.round(hue2rgb(nh) * 255);
  const bb = Math.round(hue2rgb(nh - 1 / 3) * 255);
  return rgbToHex(rr, gg, bb);
}

/**
 * Samples a file or image URL with a hidden canvas and returns a palette for the "digital twin" tint.
 */
export function extractPaletteFromImageSource(src: string | HTMLImageElement): Promise<ColorPalette> {
  return new Promise((resolve, reject) => {
    const img = typeof src === "string" ? new Image() : src;
    const run = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = Math.min(SAMPLE, img.naturalWidth || img.width);
        const h = Math.min(SAMPLE, img.naturalHeight || img.height);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ primary: "#94a3b8", accent: "#f4b942" });
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const rr = data[i]!;
          const gg = data[i + 1]!;
          const bb = data[i + 2]!;
          const s = rr + gg + bb;
          if (s < 40 || s > 740) continue;
          r += rr;
          g += gg;
          b += bb;
          n++;
        }
        if (n === 0) {
          r = g = b = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]!;
            g += data[i + 1]!;
            b += data[i + 2]!;
            n++;
          }
        }
        const primary = rgbToHex(
          Math.round(r / n),
          Math.round(g / n),
          Math.round(b / n),
        );
        const accent = deriveAccent(primary);
        resolve({ primary, accent });
      } catch (e) {
        reject(e);
      }
    };

    if (typeof src === "string") {
      img.crossOrigin = "anonymous";
      img.onload = run;
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = src;
    } else {
      if (img.complete) run();
      else {
        img.onload = run;
        img.onerror = () => reject(new Error("Image load failed"));
      }
    }
  });
}

export function useColorExtract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractFromFile = useCallback(async (file: File): Promise<ColorPalette | null> => {
    setLoading(true);
    setError(null);
    try {
      const url = URL.createObjectURL(file);
      try {
        const palette = await extractPaletteFromImageSource(url);
        return palette;
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not read colors";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { extractFromFile, loading, error, clearError: () => setError(null) };
}
