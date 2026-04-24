import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { UserChip } from "../../components/social/UserChip";
import type { ForumPostJson, ForumRoomJson } from "../api/hubApiTypes";
import { HubConfirmDialog } from "../components/HubConfirmDialog";
import type { ForumSort } from "../types";
import { sortPostsByMode } from "../utils/forumSort";

export function CommunityFeedPage() {
  const { roomSlug } = useParams();
  const slug = roomSlug ?? "general";
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [rooms, setRooms] = useState<ForumRoomJson[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [posts, setPosts] = useState<ForumPostJson[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [sort, setSort] = useState<ForumSort>("hot");

  const [forumOpen, setForumOpen] = useState(false);
  const [newForumTitle, setNewForumTitle] = useState("");
  const [newForumDesc, setNewForumDesc] = useState("");
  const [forumErr, setForumErr] = useState<string | null>(null);

  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postErr, setPostErr] = useState<string | null>(null);

  const [delRoomId, setDelRoomId] = useState<number | null>(null);
  const [delPostId, setDelPostId] = useState<number | null>(null);

  const loadRooms = useCallback(() => {
    setRoomsLoading(true);
    void api<ForumRoomJson[]>("/api/hub/forum/rooms")
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setRoomsLoading(false));
  }, []);

  const loadPosts = useCallback(() => {
    setLoadErr(null);
    void api<ForumPostJson[]>(`/api/hub/forum/rooms/${encodeURIComponent(slug)}/posts`)
      .then(setPosts)
      .catch(() => {
        setPosts([]);
        setLoadErr("Could not load threads for this forum.");
      });
  }, [slug]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (roomsLoading || rooms.length === 0) return;
    if (!rooms.some((r) => r.slug === slug)) {
      navigate(`/hub/community/${rooms[0].slug}`, { replace: true });
    }
  }, [rooms, roomsLoading, slug, navigate]);

  const room = rooms.find((r) => r.slug === slug);
  const sorted = sortPostsByMode(posts, sort);

  async function onCreateForum(e: FormEvent) {
    e.preventDefault();
    setForumErr(null);
    if (!isAdmin) return;
    try {
      const created = await api<{ id: number; slug: string; title: string; description: string | null; icon: string; createdByUserId: number | null }>(
        "/api/admin/hub/forum/rooms",
        {
          method: "POST",
          body: JSON.stringify({ title: newForumTitle.trim(), description: newForumDesc.trim() }),
        },
      );
      setNewForumTitle("");
      setNewForumDesc("");
      setForumOpen(false);
      loadRooms();
      navigate(`/hub/community/${created.slug}`);
    } catch (ex) {
      setForumErr(ex instanceof Error ? ex.message : "Could not create forum.");
    }
  }

  async function onCreatePost(e: FormEvent) {
    e.preventDefault();
    setPostErr(null);
    if (!user) {
      setPostErr("Sign in to post.");
      return;
    }
    const t = postTitle.trim();
    const b = postBody.trim();
    if (t.length < 3 || b.length < 1) {
      setPostErr("Title (3+ chars) and body required.");
      return;
    }
    try {
      await api(`/api/hub/forum/rooms/${encodeURIComponent(slug)}/posts`, {
        method: "POST",
        body: JSON.stringify({ title: t, body: b }),
      });
      setPostTitle("");
      setPostBody("");
      loadPosts();
    } catch (ex) {
      setPostErr(ex instanceof Error ? ex.message : "Could not post thread.");
    }
  }

  if (roomsLoading) {
    return (
      <div className="ph-surface" style={{ padding: "2rem", textAlign: "center", color: "var(--color-muted)" }}>
        Loading forums…
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="ph-surface" style={{ padding: "1.5rem" }}>
        <p>No forums yet. An admin can create one from the Community tab (moderator controls).</p>
      </div>
    );
  }

  return (
    <div>
      <header style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.65rem", margin: "0 0 0.35rem" }}>Community</h1>
          <p style={{ margin: 0, color: "var(--color-muted)", maxWidth: "52ch" }}>
            Browse forums, start threads, and join the discussion. Voting and replies work on each thread page.
          </p>
        </div>
        {isAdmin && (
          <Dialog.Root open={forumOpen} onOpenChange={setForumOpen}>
            <Dialog.Trigger asChild>
              <button type="button" className="ph-btn ph-btn-accent" style={{ gap: "0.35rem" }}>
                <Plus size={18} aria-hidden />
                New forum
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="hub-dialog-overlay" />
              <Dialog.Content className="hub-dialog-content" style={{ top: "12%", maxHeight: "85vh" }} aria-describedby={undefined}>
                <Dialog.Title style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-border)", margin: 0, fontFamily: "var(--font-display)" }}>
                  Create a forum (moderator)
                </Dialog.Title>
                <form onSubmit={(e) => void onCreateForum(e)} style={{ padding: "1rem" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Name</label>
                  <input className="ph-input" value={newForumTitle} onChange={(e) => setNewForumTitle(e.target.value)} placeholder="e.g. Senior cats" required />
                  <label style={{ display: "block", fontWeight: 600, margin: "0.75rem 0 0.35rem", fontSize: "0.9rem" }}>Description</label>
                  <textarea className="ph-textarea" rows={3} value={newForumDesc} onChange={(e) => setNewForumDesc(e.target.value)} placeholder="What is this forum about?" required />
                  {forumErr && <p style={{ color: "#b42318", fontSize: "0.88rem", margin: "0.5rem 0 0" }}>{forumErr}</p>}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "flex-end" }}>
                    <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setForumOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="ph-btn ph-btn-primary">
                      Create &amp; open
                    </button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </header>

      <nav className="pm-hub-tabs" aria-label="Forums" style={{ flexWrap: "wrap", rowGap: "0.35rem" }}>
        {rooms.map((r) => (
          <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.15rem" }}>
            <Link to={`/hub/community/${r.slug}`} className={clsx("pm-hub-tab", r.slug === slug && "pm-hub-tab--active")}>
              {r.title}
            </Link>
            {isAdmin && (
              <button
                type="button"
                className="ph-btn ph-btn-ghost"
                style={{ padding: "0.15rem 0.35rem", minWidth: "auto" }}
                title="Delete entire forum"
                aria-label={`Delete forum ${r.title}`}
                onClick={(e) => {
                  e.preventDefault();
                  setDelRoomId(r.id);
                }}
              >
                <Trash2 size={14} color="#b42318" />
              </button>
            )}
          </span>
        ))}
      </nav>

      {room && (
        <p className="hub-meta" style={{ margin: "0.5rem 0 1rem" }}>
          {room.description ?? ""}
          {room.createdByUserId != null && <span style={{ marginLeft: "0.35rem" }}>· Member-created</span>}
        </p>
      )}

      {user && room && (
        <motion.form
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="ph-surface"
          style={{ padding: "1rem", marginBottom: "1.25rem" }}
          onSubmit={(e) => void onCreatePost(e)}
        >
          <h2 style={{ margin: "0 0 0.75rem", fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>New thread</h2>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.88rem" }}>Title</label>
          <input className="ph-input" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="What’s on your mind?" />
          <label style={{ display: "block", fontWeight: 600, margin: "0.65rem 0 0.35rem", fontSize: "0.88rem" }}>Body</label>
          <textarea className="ph-textarea" rows={5} value={postBody} onChange={(e) => setPostBody(e.target.value)} placeholder="Text (supports long questions)" />
          {postErr && <p style={{ color: "#b42318", fontSize: "0.88rem", margin: "0.5rem 0 0" }}>{postErr}</p>}
          <button type="submit" className="ph-btn ph-btn-primary" style={{ marginTop: "0.65rem" }}>
            Post thread
          </button>
        </motion.form>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-muted)", marginRight: "0.25rem" }}>Sort</span>
        {(["hot", "new", "unanswered"] as const).map((s) => (
          <button key={s} type="button" className={clsx("hub-sort-tab", sort === s && "hub-sort-tab--active")} onClick={() => setSort(s)}>
            {s === "hot" ? "Hot" : s === "new" ? "New" : "Unanswered"}
          </button>
        ))}
      </div>

      {loadErr && <p style={{ color: "#b42318", marginBottom: "0.75rem" }}>{loadErr}</p>}

      <section aria-label="Threads">
        {sorted.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>No threads yet — start one above.</p>
        ) : (
          sorted.map((p, i) => (
            <motion.article
              key={p.id}
              className="hub-post-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}
            >
              <div className="hub-vote-col" aria-hidden style={{ minWidth: 44, textAlign: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "1.05rem", display: "block" }}>{p.score}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>pts</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                  <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>
                    <Link to={`/hub/community/${p.roomSlug}/p/${p.id}`} style={{ color: "var(--hub-charcoal)", fontWeight: 700 }}>
                      {p.title}
                    </Link>
                  </h2>
                  {isAdmin && (
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost"
                      style={{ padding: "0.25rem", minWidth: "auto", flexShrink: 0 }}
                      title="Remove thread"
                      aria-label="Remove thread"
                      onClick={() => setDelPostId(p.id)}
                    >
                      <Trash2 size={16} color="#b42318" />
                    </button>
                  )}
                </div>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.45 }}>
                  {p.body.slice(0, 180)}
                  {p.body.length > 180 ? "…" : ""}
                </p>
                <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.35rem" }}>
                  <UserChip userId={p.authorUserId} displayName={p.authorDisplayName} avatarUrl={null} size="sm" />
                  <span>· {p.commentCount} comments · {new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </section>

      <HubConfirmDialog
        open={delRoomId != null}
        onOpenChange={(o) => !o && setDelRoomId(null)}
        title="Delete this entire forum?"
        description="All threads and comments in this forum will be permanently removed."
        confirmLabel="Delete forum"
        danger
        onConfirm={async () => {
          if (delRoomId == null) return;
          await api(`/api/admin/hub/forum/rooms/${delRoomId}`, { method: "DELETE" });
          loadRooms();
          navigate("/hub/community/help");
        }}
      />

      <HubConfirmDialog
        open={delPostId != null}
        onOpenChange={(o) => !o && setDelPostId(null)}
        title="Delete this thread?"
        description="Removes the post and all comments."
        confirmLabel="Delete thread"
        danger
        onConfirm={async () => {
          if (delPostId == null) return;
          await api(`/api/admin/hub/forum/posts/${delPostId}`, { method: "DELETE" });
          loadPosts();
        }}
      />
    </div>
  );
}
