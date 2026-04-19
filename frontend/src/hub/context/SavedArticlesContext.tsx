import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "pawhub_saved_articles";

type Ctx = {
  savedIds: Set<string>;
  toggle: (articleId: string) => void;
  isSaved: (articleId: string) => boolean;
};

const SavedArticlesContext = createContext<Ctx | null>(null);

function loadInitial(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function SavedArticlesProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(loadInitial);

  const persist = useCallback((next: Set<string>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }, []);

  const toggle = useCallback((articleId: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      persist(next);
      return next;
    });
  }, [persist]);

  const isSaved = useCallback((articleId: string) => savedIds.has(articleId), [savedIds]);

  const value = useMemo(() => ({ savedIds, toggle, isSaved }), [savedIds, toggle, isSaved]);

  return <SavedArticlesContext.Provider value={value}>{children}</SavedArticlesContext.Provider>;
}

export function useSavedArticles() {
  const ctx = useContext(SavedArticlesContext);
  if (!ctx) throw new Error("useSavedArticles must be used within SavedArticlesProvider");
  return ctx;
}
