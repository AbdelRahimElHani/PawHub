/** JSON shapes from Spring Boot hub endpoints (camelCase). */

export type HubFaqJson = {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  healthRelated: boolean;
  sortOrder: number;
  sectionTitle: string | null;
};

export type HubEditorialJson = {
  id: string;
  title: string;
  url: string;
  topicId: string;
  sourceLabel: string | null;
  dek: string | null;
  imageUrl: string | null;
  featured: boolean;
  sortOrder: number;
  sectionTitle: string | null;
};

export type ForumRoomJson = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  createdByUserId: number | null;
  adminOnlyPosts: boolean;
};

export type ForumPostJson = {
  id: number;
  roomSlug: string;
  authorUserId: number;
  authorDisplayName: string;
  title: string;
  body: string;
  createdAt: string;
  score: number;
  commentCount: number;
  helpfulCommentId: number | null;
};

export type ForumCommentJson = {
  id: number;
  postId: number;
  parentId: number | null;
  authorUserId: number;
  authorDisplayName: string;
  body: string;
  createdAt: string;
  deleted: boolean;
  deletedByAdmin: boolean;
  attachmentUrl: string | null;
  children: ForumCommentJson[];
};

export type ForumPostDetailJson = {
  post: ForumPostJson;
  comments: ForumCommentJson[];
  myVote: number | null;
};
