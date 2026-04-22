import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LifestyleFilterId } from "./adoptPersonality";

type AdoptState = {
  favorites: number[];
  filterCriteria: LifestyleFilterId;
  toggleFavorite: (listingId: number) => void;
  isFavorite: (listingId: number) => boolean;
  setFilterCriteria: (id: LifestyleFilterId) => void;
};

export const useAdoptStore = create<AdoptState>()(
  persist(
    (set, get) => ({
      favorites: [],
      filterCriteria: "all",
      toggleFavorite: (listingId) =>
        set((s) => ({
          favorites: s.favorites.includes(listingId)
            ? s.favorites.filter((id) => id !== listingId)
            : [...s.favorites, listingId],
        })),
      isFavorite: (listingId) => get().favorites.includes(listingId),
      setFilterCriteria: (filterCriteria) => set({ filterCriteria }),
    }),
    { name: "pawhub-adopt-love-list" },
  ),
);
