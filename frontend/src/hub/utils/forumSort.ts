import type { ForumPost, ForumSort } from "../types";

export type SortablePostFields = { score: number; commentCount: number; createdAt: string };

function hotScoreGeneric(p: SortablePostFields): number {
  const t = new Date(p.createdAt).getTime();
  const hours = (Date.now() - t) / 36e5;
  const gravity = 1.8;
  return (p.score + Math.log2(p.commentCount + 1) * 8) / Math.pow(hours + 2, gravity);
}

/** API-backed threads + mock data — same Hot / New / Unanswered behavior. */
export function sortPostsByMode<T extends SortablePostFields>(posts: T[], sort: ForumSort): T[] {
  const copy = [...posts];
  if (sort === "new") {
    return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  if (sort === "unanswered") {
    return copy
      .filter((p) => p.commentCount === 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return copy.sort((a, b) => hotScoreGeneric(b) - hotScoreGeneric(a));
}

export function sortForumPosts(posts: ForumPost[], sort: ForumSort): ForumPost[] {
  return sortPostsByMode(posts, sort);
}
