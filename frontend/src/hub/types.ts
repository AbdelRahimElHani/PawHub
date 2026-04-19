/**
 * Content & community models for the PawHub Learn hub.
 * Swap `mockData.ts` for API/Supabase responses later — keep field names stable.
 */

export type FaqCategoryId =
  | "new-owners"
  | "nutrition"
  | "litter-box"
  | "behavior"
  | "health"
  | "life-stages";

export type FAQItem = {
  id: string;
  categoryId: FaqCategoryId;
  question: string;
  /** Plain text; paragraphs separated by blank lines (\n\n). */
  answer: string;
  isHealthRelated: boolean;
};

/** Curated external reading — opens in a new tab; no in-app article body. */
export type ExternalLinkEntry = {
  id: string;
  title: string;
  url: string;
  /** Topic id for filtering (see EDITORIAL_TOPICS in mockData). */
  topicId: string;
  sourceLabel: string;
  dek: string;
  imageUrl: string | null;
  featured?: boolean;
};

export type UserBadge = "NEW_CAT_PARENT" | "VERIFIED_EXPERT" | "SHELTER_PARTNER" | "TOP_CONTRIBUTOR";

export type User = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  badges: UserBadge[];
};

export type ForumRoom = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: "help" | "sparkles" | "brain" | "custom";
  /** Present when a member created this forum */
  createdByUserId?: number | null;
  createdAt?: string;
};

export type ForumSort = "hot" | "new" | "unanswered";

export type ForumPost = {
  id: string;
  roomSlug: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: string;
  /** Synthetic score for sorting & vote UI */
  score: number;
  commentCount: number;
  /** When OP marks a reply as helpful */
  helpfulCommentId: string | null;
};

export type ForumComment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  children: ForumComment[];
};

export type Post = ForumPost;
