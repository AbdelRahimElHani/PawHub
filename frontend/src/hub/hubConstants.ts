import type { FaqCategoryId } from "./types";

/** Tab labels for FAQ categories — article bodies come from `/api/hub/faq`. */
export const FAQ_CATEGORY_META: {
  id: FaqCategoryId;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: "new-owners",
    label: "New Owners",
    shortLabel: "New",
    description: "First weeks, gear, and safe introductions.",
  },
  {
    id: "nutrition",
    label: "Nutrition",
    shortLabel: "Food",
    description: "Meals, macros, and bowls — without the noise.",
  },
  {
    id: "litter-box",
    label: "Litter Box",
    shortLabel: "Litter",
    description: "Setup, habits, and solving common issues.",
  },
  {
    id: "behavior",
    label: "Behavior",
    shortLabel: "Behavior",
    description: "Play, stress signals, and happy routines.",
  },
  {
    id: "health",
    label: "Health",
    shortLabel: "Health",
    description: "Wellness patterns — always pair with your vet.",
  },
  {
    id: "life-stages",
    label: "Life Stages",
    shortLabel: "Stages",
    description: "Kittens, adults, and golden years.",
  },
];

/** Topic filters for Editorial — link rows come from `/api/hub/editorial`. */
export const EDITORIAL_TOPICS: { id: string; label: string }[] = [
  { id: "all", label: "All picks" },
  { id: "health", label: "Health & vet" },
  { id: "behavior", label: "Behavior & training" },
  { id: "nutrition", label: "Nutrition" },
  { id: "welfare", label: "Welfare & environment" },
  { id: "science", label: "Science & news" },
];
