import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../../auth/AuthContext";
import type { ForumComment, ForumPost, ForumRoom, User } from "../types";
import {
  COMMENTS_BY_POST as SEED_COMMENTS,
  FORUM_POSTS as SEED_POSTS,
  FORUM_ROOMS as SEED_ROOMS,
  USERS as SEED_USERS,
} from "../mockData";

const STORAGE_KEY = "pawhub_forum_state_v2";

type Persisted = {
  rooms: ForumRoom[];
  posts: ForumPost[];
  commentsByPost: Record<string, ForumComment[]>;
  users: Record<string, User>;
  /** postId -> userKey -> 1 | -1 */
  userPostVotes: Record<string, Record<string, 1 | -1>>;
  helpfulByPost: Record<string, string>;
};

function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
  return s || `forum-${uid()}`;
}

function addCommentToTree(nodes: ForumComment[], parentId: string | null, comment: ForumComment): ForumComment[] {
  if (parentId === null) return [...nodes, comment];
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...n.children, comment] };
    if (n.children.length === 0) return n;
    return { ...n, children: addCommentToTree(n.children, parentId, comment) };
  });
}

function countTree(nodes: ForumComment[]): number {
  return nodes.reduce((acc, n) => acc + 1 + countTree(n.children), 0);
}

function cloneSeed(): Persisted {
  return {
    rooms: SEED_ROOMS.map((r) => ({ ...r })),
    posts: SEED_POSTS.map((p) => ({ ...p })),
    commentsByPost: JSON.parse(JSON.stringify(SEED_COMMENTS)) as Record<string, ForumComment[]>,
    users: { ...SEED_USERS },
    userPostVotes: {},
    helpfulByPost: {},
  };
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSeed();
    const p = JSON.parse(raw) as Persisted;
    if (!p.rooms || !p.posts || !p.commentsByPost) return cloneSeed();
    return {
      rooms: p.rooms,
      posts: p.posts,
      commentsByPost: p.commentsByPost,
      users: { ...SEED_USERS, ...p.users },
      userPostVotes: p.userPostVotes ?? {},
      helpfulByPost: p.helpfulByPost ?? {},
    };
  } catch {
    return cloneSeed();
  }
}

const memberKey = (userId: number) => `member:${userId}`;

type ForumCtx = {
  rooms: ForumRoom[];
  getPostsForRoom: (roomSlug: string) => ForumPost[];
  getPost: (id: string) => ForumPost | undefined;
  getComments: (postId: string) => ForumComment[];
  resolveUser: (authorId: string) => User;
  createRoom: (title: string, description: string) => { ok: true; slug: string } | { ok: false; error: string };
  createPost: (roomSlug: string, title: string, body: string) => void;
  addComment: (postId: string, parentId: string | null, body: string) => void;
  votePost: (postId: string, direction: "up" | "down") => void;
  getUserVote: (postId: string) => 1 | -1 | 0;
  setHelpfulComment: (postId: string, commentId: string) => void;
  getHelpful: (postId: string) => string | null;
};

const ForumContext = createContext<ForumCtx | null>(null);

export function ForumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<Persisted>(() => loadPersisted());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!user) return;
    const k = memberKey(user.userId);
    setState((s) => ({
      ...s,
      users: {
        ...s.users,
        [k]: {
          id: k,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          badges: [],
        },
      },
    }));
  }, [user?.userId, user?.displayName, user?.avatarUrl]);

  const resolveUser = useCallback(
    (authorId: string): User => {
      const fromState = state.users[authorId];
      if (fromState) return fromState;
      return {
        id: authorId,
        displayName: "Member",
        avatarUrl: null,
        badges: [],
      };
    },
    [state.users],
  );

  const getPost = useCallback((id: string) => state.posts.find((p) => p.id === id), [state.posts]);

  const getPostsForRoom = useCallback(
    (roomSlug: string) => state.posts.filter((p) => p.roomSlug === roomSlug),
    [state.posts],
  );

  const getComments = useCallback((postId: string) => state.commentsByPost[postId] ?? [], [state.commentsByPost]);

  const userKey = user ? memberKey(user.userId) : "anon";

  const getUserVote = useCallback(
    (postId: string): 1 | -1 | 0 => {
      const v = state.userPostVotes[postId]?.[userKey];
      return v ?? 0;
    },
    [state.userPostVotes, userKey],
  );

  const getHelpful = useCallback(
    (postId: string) => {
      const p = state.posts.find((x) => x.id === postId);
      return state.helpfulByPost[postId] ?? p?.helpfulCommentId ?? null;
    },
    [state.helpfulByPost, state.posts],
  );

  const votePost = useCallback(
    (postId: string, direction: "up" | "down") => {
      if (!user) return;
      const want: 1 | -1 = direction === "up" ? 1 : -1;
      setState((s) => {
        const post = s.posts.find((p) => p.id === postId);
        if (!post) return s;
        const raw = s.userPostVotes[postId]?.[userKey];
        const prev: 0 | 1 | -1 = raw === undefined ? 0 : raw;
        let delta = 0;
        let newVal: 1 | -1 | undefined;
        if (prev === want) {
          newVal = undefined;
          delta = -want;
        } else if (prev === 0) {
          newVal = want;
          delta = want;
        } else {
          newVal = want;
          delta = want - prev;
        }
        const nextForPost = { ...(s.userPostVotes[postId] ?? {}) };
        if (newVal === undefined) delete nextForPost[userKey];
        else nextForPost[userKey] = newVal;
        const userPostVotes = { ...s.userPostVotes };
        if (Object.keys(nextForPost).length === 0) delete userPostVotes[postId];
        else userPostVotes[postId] = nextForPost;
        return {
          ...s,
          userPostVotes,
          posts: s.posts.map((p) => (p.id === postId ? { ...p, score: p.score + delta } : p)),
        };
      });
    },
    [user, userKey],
  );

  const createRoom = useCallback(
    (title: string, description: string): { ok: true; slug: string } | { ok: false; error: string } => {
      if (!user) return { ok: false, error: "Sign in to create a forum." };
      const t = title.trim();
      const d = description.trim();
      if (t.length < 3) return { ok: false, error: "Title should be at least 3 characters." };
      if (d.length < 8) return { ok: false, error: "Add a short description (8+ characters)." };
      let resolvedSlug = "";
      setState((s) => {
        let base = slugify(t);
        let unique = base;
        let n = 2;
        while (s.rooms.some((r) => r.slug === unique)) {
          unique = `${base}-${n++}`;
        }
        resolvedSlug = unique;
        const room: ForumRoom = {
          id: `room_${uid()}`,
          slug: unique,
          title: t,
          description: d,
          icon: "custom",
          createdByUserId: user.userId,
          createdAt: new Date().toISOString(),
        };
        return { ...s, rooms: [...s.rooms, room] };
      });
      return { ok: true, slug: resolvedSlug };
    },
    [user],
  );

  const createPost = useCallback(
    (roomSlug: string, title: string, body: string) => {
      if (!user) return;
      const t = title.trim();
      const b = body.trim();
      if (t.length < 3 || b.length < 1) return;
      const authorId = memberKey(user.userId);
      const post: ForumPost = {
        id: `p_${uid()}`,
        roomSlug,
        authorId,
        title: t,
        body: b,
        createdAt: new Date().toISOString(),
        score: 1,
        commentCount: 0,
        helpfulCommentId: null,
      };
      setState((s) => ({
        ...s,
        posts: [post, ...s.posts],
        users: {
          ...s.users,
          [authorId]: {
            id: authorId,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            badges: [],
          },
        },
      }));
    },
    [user],
  );

  const addComment = useCallback(
    (postId: string, parentId: string | null, body: string) => {
      if (!user) return;
      const text = body.trim();
      if (text.length < 1) return;
      const authorId = memberKey(user.userId);
      const c: ForumComment = {
        id: `c_${uid()}`,
        postId,
        authorId,
        body: text,
        createdAt: new Date().toISOString(),
        children: [],
      };
      setState((s) => {
        const tree = s.commentsByPost[postId] ?? [];
        const nextTree = addCommentToTree(tree, parentId, c);
        const added = countTree(nextTree) - countTree(tree);
        return {
          ...s,
          commentsByPost: { ...s.commentsByPost, [postId]: nextTree },
          users: {
            ...s.users,
            [authorId]: {
              id: authorId,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              badges: [],
            },
          },
          posts: s.posts.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + added } : p)),
        };
      });
    },
    [user],
  );

  const setHelpfulComment = useCallback((postId: string, commentId: string) => {
    setState((s) => ({
      ...s,
      helpfulByPost: { ...s.helpfulByPost, [postId]: commentId },
      posts: s.posts.map((p) => (p.id === postId ? { ...p, helpfulCommentId: commentId } : p)),
    }));
  }, []);

  const value = useMemo<ForumCtx>(
    () => ({
      rooms: state.rooms,
      getPostsForRoom,
      getPost,
      getComments,
      resolveUser,
      createRoom,
      createPost,
      addComment,
      votePost,
      getUserVote,
      setHelpfulComment,
      getHelpful,
    }),
    [
      state.rooms,
      getPostsForRoom,
      getPost,
      getComments,
      resolveUser,
      createRoom,
      createPost,
      addComment,
      votePost,
      getUserVote,
      setHelpfulComment,
      getHelpful,
    ],
  );

  return <ForumContext.Provider value={value}>{children}</ForumContext.Provider>;
}

export function useForum() {
  const ctx = useContext(ForumContext);
  if (!ctx) throw new Error("useForum must be used within ForumProvider");
  return ctx;
}
