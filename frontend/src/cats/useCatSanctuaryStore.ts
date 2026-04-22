import { create } from "zustand";
import { api } from "../api/client";
import type { CatDto } from "../types";
import type { CatEnrichment, CatVisionProfile, CatVibe, ColorPalette, EnrichedCat } from "./catTypes";
import { defaultVibeForName, distinctPaletteForCat, mergeCat } from "./catTypes";

const ENRICHMENT_KEY = "pawhub_cat_sanctuary_v1";

type EnrichmentMap = Record<string, CatEnrichment>;

function loadMap(): EnrichmentMap {
  try {
    const raw = localStorage.getItem(ENRICHMENT_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as EnrichmentMap;
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

function saveMap(map: EnrichmentMap) {
  try {
    localStorage.setItem(ENRICHMENT_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

function getEnrichment(map: EnrichmentMap, id: number): CatEnrichment | undefined {
  const e = map[String(id)];
  if (!e || typeof e !== "object") return undefined;
  return e;
}

type State = {
  cats: EnrichedCat[];
  loading: boolean;
  error: string | null;
  fetchCats: () => Promise<void>;
  updateEnrichment: (catId: number, patch: Partial<CatEnrichment>) => void;
  addCat: (input: {
    name: string;
    breed: string;
    birthday: string;
    vibe: CatVibe;
    colorPalette: ColorPalette;
    photoFile: File | null;
    visionProfile?: CatVisionProfile | null;
  }) => Promise<number>;
};

export const useCatSanctuaryStore = create<State>((set, get) => ({
  cats: [],
  loading: false,
  error: null,

  fetchCats: async () => {
    set({ loading: true, error: null });
    try {
      const list = await api<CatDto[]>("/api/cats");
      const map = loadMap();
      const cats: EnrichedCat[] = list.map((c) => mergeCat(c, getEnrichment(map, c.id)));
      set({ cats, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load cats",
      });
    }
  },

  updateEnrichment: (catId, patch) => {
    const cat = get().cats.find((c) => c.id === catId);
    const map = loadMap();
    const vibe = cat?.vibe ?? defaultVibeForName(cat?.name ?? "");
    const prev = getEnrichment(map, catId) ?? {
      vibe,
      colorPalette: cat?.colorPalette ?? distinctPaletteForCat(catId, cat?.name ?? "cat", vibe),
      position: (cat?.position ?? [0, 0, 0]) as [number, number, number],
      birthday: cat?.birthday,
      visionProfile: cat?.visionProfile,
    };
    map[String(catId)] = { ...prev, ...patch };
    saveMap(map);
    set((s) => ({
      cats: s.cats.map((c) => (c.id === catId ? mergeCat(c, map[String(catId)]) : c)),
    }));
  },

  addCat: async ({ name, breed, birthday, vibe, colorPalette, photoFile, visionProfile }) => {
    set({ error: null });
    let ageMonths: number | null = null;
    if (birthday) {
      const born = new Date(birthday);
      if (!Number.isNaN(born.getTime())) {
        const diff = Date.now() - born.getTime();
        ageMonths = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44)));
      }
    }
    const created = await api<CatDto>("/api/cats", {
      method: "POST",
      body: JSON.stringify({
        name,
        breed: breed || null,
        ageMonths,
        gender: null,
        bio: null,
      }),
    });
    const map = loadMap();
    map[String(created.id)] = {
      vibe,
      colorPalette,
      position: [0, 0, 0],
      birthday: birthday || undefined,
      ...(visionProfile ? { visionProfile } : {}),
    };
    saveMap(map);
    if (photoFile) {
      const fd = new FormData();
      fd.append("file", photoFile);
      await api(`/api/cats/${created.id}/photos`, { method: "POST", body: fd });
    }
    await get().fetchCats();
    return created.id;
  },
}));
