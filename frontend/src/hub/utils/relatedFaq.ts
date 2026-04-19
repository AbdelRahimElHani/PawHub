import type { FAQItem } from "../types";

/** Prefer same category; fill from global list if fewer than `count`. */
export function relatedFaqItems(current: FAQItem, all: FAQItem[], count = 3): FAQItem[] {
  const same = all.filter((f) => f.categoryId === current.categoryId && f.id !== current.id);
  const rest = all.filter((f) => f.categoryId !== current.categoryId && f.id !== current.id);
  const merged = [...same, ...rest];
  return merged.slice(0, count);
}
