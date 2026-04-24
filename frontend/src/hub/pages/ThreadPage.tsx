import { CheckCircle2, ChevronDown, ChevronUp, Flag, Trash2 } from "lucide-react";
import clsx from "clsx";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { ForumCommentJson, ForumPostDetailJson } from "../api/hubApiTypes";
import { UserChip } from "../../components/social/UserChip";
import { HubConfirmDialog } from "../components/HubConfirmDialog";

export function ThreadPage() {
  const { roomSlug, postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const numericId = postId ? Number.parseInt(postId, 10) : NaN;

  const [detail, setDetail] = useState<ForumPostDetailJson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [topDraft, setTopDraft] = useState("");
  const [voteBusy, setVoteBusy] = useState(false);
  const [delPostOpen, setDelPostOpen] = useState(false);
  const [delCommentId, setDelCommentId] = useState<number | null>(null);

  const reload = useCallback(() => {
    if (!Number.isFinite(numericId)) return;
    setErr(null);
    void api<ForumPostDetailJson>(`/api/hub/forum/posts/${numericId}`)
      .then(setDetail)
      .catch(() => {
        setDetail(null);
        setErr("Thread not found or you’re offline.");
      });
  }, [numericId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function vote(value: number) {
    if (!user || !Number.isFinite(numericId) || voteBusy) return;
    setVoteBusy(true);
    try {
      const d = await api<ForumPostDetailJson>(`/api/hub/forum/posts/${numericId}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
      });
      setDetail(d);
    } finally {
      setVoteBusy(false);
    }
  }

  async function onTopComment(e: FormEvent) {
    e.preventDefault();
    if (!user || !detail || !Number.isFinite(numericId)) return;
    const t = topDraft.trim();
    if (!t) return;
    await api(`/api/hub/forum/posts/${numericId}/comments`, {
      method: "POST",
      body: JSON.stringify({ parentId: null, body: t }),
    });
    setTopDraft("");
    reload();
  }

  async function markHelpful(commentId: number) {
    if (!detail || !Number.isFinite(numericId)) return;
    await api(`/api/hub/forum/posts/${numericId}/helpful`, {
      method: "POST",
      body: JSON.stringify({ commentId }),
    });
    reload();
  }

  async function deletePost() {
    if (!Number.isFinite(numericId)) return;
    await api(`/api/admin/hub/forum/posts/${numericId}`, { method: "DELETE" });
    navigate(`/hub/community/${roomSlug ?? detail?.post.roomSlug ?? "general"}`);
  }

  async function deleteComment() {
    if (delCommentId == null) return;
    await api(`/api/admin/hub/forum/comments/${delCommentId}`, { method: "DELETE" });
    setDelCommentId(null);
    reload();
  }

  if (!Number.isFinite(numericId)) {
    return (
      <div className="ph-surface" style={{ padding: "1.5rem" }}>
        <p>Invalid thread link.</p>
      </div>
    );
  }

  if (err || !detail) {
    return (
      <div className="ph-surface" style={{ padding: "1.5rem" }}>
        <p>{err ?? "Loading…"}</p>
        <Link to={`/hub/community/${roomSlug ?? "help"}`}>Back to room</Link>
      </div>
    );
  }

  if (roomSlug && detail.post.roomSlug !== roomSlug) {
    return (
      <div className="ph-surface" style={{ padding: "1.5rem" }}>
        <p>Thread is in another forum.</p>
        <Link to={`/hub/community/${detail.post.roomSlug}/p/${detail.post.id}`}>Open correct thread</Link>
      </div>
    );
  }

  const p = detail.post;
  const myVote = detail.myVote;
  const isOpViewer = user != null && user.userId === p.authorUserId;

  return (
    <div>
      <nav style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <Link to={`/hub/community/${p.roomSlug}`} style={{ fontWeight: 600 }}>
          ← {p.roomSlug}
        </Link>
        {isAdmin && (
          <>
            <button type="button" className="ph-btn ph-btn-ghost" style={{ color: "#b42318", marginLeft: "auto" }} onClick={() => setDelPostOpen(true)}>
              <Trash2 size={16} style={{ marginRight: "0.35rem" }} aria-hidden />
              Remove thread
            </button>
            <HubConfirmDialog
              open={delPostOpen}
              onOpenChange={setDelPostOpen}
              title="Delete this thread?"
              description="Removes the post and all comments permanently."
              confirmLabel="Delete"
              danger
              onConfirm={deletePost}
            />
          </>
        )}
      </nav>

      <article className="ph-surface" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <div className="hub-vote-col" aria-label={user ? "Vote" : "Score"}>
            <button
              type="button"
              className={clsx("ph-btn ph-btn-ghost", myVote === 1 && "hub-vote--active")}
              style={{ padding: "0.2rem", minWidth: "auto", borderRadius: "8px", opacity: user ? 1 : 0.45 }}
              disabled={!user || voteBusy}
              onClick={() => void vote(myVote === 1 ? 0 : 1)}
              aria-label="Upvote"
            >
              <ChevronUp size={18} />
            </button>
            <span aria-live="polite">{p.score}</span>
            <button
              type="button"
              className={clsx("ph-btn ph-btn-ghost", myVote === -1 && "hub-vote--active")}
              style={{ padding: "0.2rem", minWidth: "auto", borderRadius: "8px", opacity: user ? 1 : 0.45 }}
              disabled={!user || voteBusy}
              onClick={() => void vote(myVote === -1 ? 0 : -1)}
              aria-label="Downvote"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.45rem", margin: "0 0 0.75rem", lineHeight: 1.25 }}>{p.title}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
              <UserChip userId={p.authorUserId} displayName={p.authorDisplayName} avatarUrl={null} size="sm" />
              <time dateTime={p.createdAt} style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginLeft: "auto" }}>
                {new Date(p.createdAt).toLocaleString()}
              </time>
            </div>
            <p style={{ margin: 0, lineHeight: 1.65, fontSize: "1rem" }}>{p.body}</p>
            <div style={{ marginTop: "1rem" }}>
              <button type="button" className="ph-btn ph-btn-ghost" aria-label="Report post">
                <Flag size={16} style={{ marginRight: "0.35rem" }} aria-hidden />
                Report post
              </button>
            </div>
          </div>
        </div>
      </article>

      <section aria-label="Comments">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", margin: "0 0 0.75rem" }}>
          Discussion <span style={{ color: "var(--color-muted)", fontWeight: 500 }}>({p.commentCount})</span>
        </h2>

        {user && (
          <form onSubmit={(e) => void onTopComment(e)} className="ph-surface" style={{ padding: "1rem", marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Add a comment</label>
            <textarea className="ph-textarea" rows={4} placeholder="Share advice or ask a follow-up…" value={topDraft} onChange={(e) => setTopDraft(e.target.value)} />
            <button type="submit" className="ph-btn ph-btn-primary" style={{ marginTop: "0.5rem" }} disabled={!topDraft.trim()}>
              Comment
            </button>
          </form>
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {detail.comments.map((c) => (
            <CommentBranch
              key={c.id}
              node={c}
              postAuthorId={p.authorUserId}
              postId={numericId}
              helpfulId={p.helpfulCommentId}
              currentUserId={user?.userId ?? null}
              isOpViewer={isOpViewer}
              isAdmin={isAdmin}
              onReply={reload}
              onMarkHelpful={markHelpful}
              onAdminDelete={(id) => setDelCommentId(id)}
            />
          ))}
        </ul>
      </section>

      <HubConfirmDialog
        open={delCommentId != null}
        onOpenChange={(o) => !o && setDelCommentId(null)}
        title="Delete this comment?"
        description="Nested replies may also be removed."
        confirmLabel="Delete"
        danger
        onConfirm={deleteComment}
      />
    </div>
  );
}

function CommentBranch({
  node,
  depth = 0,
  postAuthorId,
  postId,
  helpfulId,
  currentUserId,
  isOpViewer,
  isAdmin,
  onReply,
  onMarkHelpful,
  onAdminDelete,
}: {
  node: ForumCommentJson;
  depth?: number;
  postAuthorId: number;
  postId: number;
  helpfulId: number | null;
  currentUserId: number | null;
  isOpViewer: boolean;
  isAdmin: boolean;
  onReply: () => void;
  onMarkHelpful: (id: number) => void;
  onAdminDelete: (id: number) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const isOp = node.authorUserId === postAuthorId;
  const isHelpful = helpfulId === node.id;

  async function submitReply(e: FormEvent) {
    e.preventDefault();
    if (!currentUserId) return;
    const t = draft.trim();
    if (!t) return;
    await api(`/api/hub/forum/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ parentId: node.id, body: t }),
    });
    setDraft("");
    setReplyOpen(false);
    onReply();
  }

  const palette = ["var(--hub-salmon)", "var(--hub-sage)", "#c4b8a8", "#9a8f82"];
  const indent = palette[depth % palette.length];

  return (
    <li style={{ marginBottom: "0.75rem" }}>
      <article
        className={depth ? "hub-comment-nested" : undefined}
        style={{ ["--indent-color" as string]: indent, borderLeft: depth ? "3px solid var(--indent-color, #ccc)" : undefined, paddingLeft: depth ? "0.65rem" : 0 }}
      >
        <header style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
          <UserChip userId={node.authorUserId} displayName={node.authorDisplayName} avatarUrl={null} size="sm" />
          {isOp && <span className="hub-room-pill">OP</span>}
          {isHelpful && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.78rem", color: "var(--color-primary-dark)" }}>
              <CheckCircle2 size={14} aria-hidden /> Helpful answer
            </span>
          )}
          <time dateTime={node.createdAt} style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginLeft: "auto" }}>
            {new Date(node.createdAt).toLocaleString()}
          </time>
        </header>
        <p style={{ margin: "0 0 0.5rem", lineHeight: 1.55, fontSize: "0.92rem" }}>{node.body}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
          {currentUserId && (
            <button type="button" className="ph-btn ph-btn-ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "0.78rem" }} onClick={() => setReplyOpen((v) => !v)}>
              {replyOpen ? "Cancel" : "Reply"}
            </button>
          )}
          {isOpViewer && !isHelpful && node.authorUserId !== postAuthorId && (
            <button type="button" className="ph-btn ph-btn-primary" style={{ padding: "0.2rem 0.55rem", fontSize: "0.78rem" }} onClick={() => onMarkHelpful(node.id)}>
              Mark helpful answer
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              className="ph-btn ph-btn-ghost"
              style={{ padding: "0.2rem 0.5rem", fontSize: "0.78rem", color: "#b42318" }}
              onClick={() => onAdminDelete(node.id)}
            >
              <Trash2 size={14} style={{ marginRight: "0.25rem" }} aria-hidden />
              Remove
            </button>
          )}
        </div>
        {replyOpen && currentUserId && (
          <form onSubmit={(e) => void submitReply(e)} style={{ marginTop: "0.65rem" }}>
            <textarea className="ph-textarea" rows={3} placeholder="Write a reply…" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ marginBottom: "0.5rem" }} />
            <button type="submit" className="ph-btn ph-btn-primary" style={{ fontSize: "0.85rem" }} disabled={!draft.trim()}>
              Post reply
            </button>
          </form>
        )}
      </article>
      {node.children.length > 0 && (
        <ul style={{ listStyle: "none", paddingLeft: "0.75rem", marginTop: "0.5rem" }}>
          {node.children.map((ch) => (
            <CommentBranch
              key={ch.id}
              node={ch}
              depth={depth + 1}
              postAuthorId={postAuthorId}
              postId={postId}
              helpfulId={helpfulId}
              currentUserId={currentUserId}
              isOpViewer={isOpViewer}
              isAdmin={isAdmin}
              onReply={onReply}
              onMarkHelpful={onMarkHelpful}
              onAdminDelete={onAdminDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
