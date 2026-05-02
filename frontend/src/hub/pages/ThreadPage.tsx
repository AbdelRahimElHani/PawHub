import { CheckCircle2, ChevronDown, ChevronUp, Flag, ImagePlus, Pencil, SendHorizontal, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { ForumCommentJson, ForumPostDetailJson } from "../api/hubApiTypes";
import { UserChip } from "../../components/social/UserChip";
import { useMediaLightbox } from "../../components/media/MediaLightboxContext";
import { inferMediaLightboxKind } from "../../components/media/inferMediaKind";
import { HubConfirmDialog } from "../components/HubConfirmDialog";

async function uploadForumImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await api<{ url: string }>("/api/hub/forum/upload-image", { method: "POST", body: fd });
  return res.url;
}

export function ThreadPage() {
  const { roomSlug, postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const numericId = postId ? Number.parseInt(postId, 10) : NaN;

  const [detail, setDetail] = useState<ForumPostDetailJson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [voteBusy, setVoteBusy] = useState(false);
  const [delPostOpen, setDelPostOpen] = useState(false);
  const [delComment, setDelComment] = useState<{ id: number; mode: "admin" | "self" } | null>(null);

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
    if (!user || !Number.isFinite(numericId) || voteBusy || detail?.post.removedByAdmin) return;
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

  async function markHelpful(commentId: number) {
    if (!detail || !Number.isFinite(numericId) || detail.post.removedByAdmin) return;
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

  async function confirmDeleteComment() {
    if (delComment == null || !Number.isFinite(numericId)) return;
    const { id, mode } = delComment;
    setDelComment(null);
    if (mode === "admin") {
      await api(`/api/admin/hub/forum/comments/${id}`, { method: "DELETE" });
      reload();
      return;
    }
    const d = await api<ForumPostDetailJson>(`/api/hub/forum/comments/${id}`, { method: "DELETE" });
    setDetail(d);
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
  const replyGloballyDisabled = Boolean(p.noReplies) && !isAdmin;

  return (
    <div>
      <nav style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <Link to={`/hub/community/${p.roomSlug}`} style={{ fontWeight: 600 }}>
          ← {p.roomSlug}
        </Link>
        {isAdmin && !p.removedByAdmin ? (
          <>
            <button type="button" className="ph-btn ph-btn-ghost" style={{ color: "#b42318", marginLeft: "auto" }} onClick={() => setDelPostOpen(true)}>
              <Trash2 size={16} style={{ marginRight: "0.35rem" }} aria-hidden />
              Remove thread
            </button>
            <HubConfirmDialog
              open={delPostOpen}
              onOpenChange={setDelPostOpen}
              title="Remove this thread?"
              description="Hides the thread from the forum and notifies the author with a preview. They can open the link in the notification to read the full post and replies."
              confirmLabel="Remove thread"
              danger
              onConfirm={deletePost}
            />
          </>
        ) : null}
      </nav>

      {p.removedByAdmin ? (
        <div
          role="status"
          style={{
            marginBottom: "1rem",
            padding: "0.85rem 1rem",
            borderRadius: 10,
            borderLeft: "4px solid #b42318",
            background: "rgba(180, 35, 24, 0.07)",
            fontSize: "0.92rem",
            lineHeight: 1.5,
            color: "var(--color-text)",
          }}
        >
          <strong>Removed by a moderator.</strong> This thread is hidden from the room list. Your full post and replies
          stay visible here; you can also open it anytime from the notification in your bell.
        </div>
      ) : null}

      <article className="ph-surface" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <div className="hub-vote-col" aria-label={user ? "Vote" : "Score"}>
            <button
              type="button"
              className={clsx("ph-btn ph-btn-ghost", myVote === 1 && "hub-vote--active")}
              style={{ padding: "0.2rem", minWidth: "auto", borderRadius: "8px", opacity: user ? 1 : 0.45 }}
              disabled={!user || voteBusy || Boolean(p.removedByAdmin)}
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
              disabled={!user || voteBusy || Boolean(p.removedByAdmin)}
              onClick={() => void vote(myVote === -1 ? 0 : -1)}
              aria-label="Downvote"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.45rem", margin: "0 0 0.75rem", lineHeight: 1.25, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
              {p.title}
              {p.noReplies && (
                <span className="hub-room-pill" title="This thread does not accept new comments from members">
                  No replies
                </span>
              )}
            </h1>
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

        {user && !p.removedByAdmin && replyGloballyDisabled && (
          <p
            className="ph-surface"
            style={{
              padding: "0.75rem 1rem",
              marginBottom: "0.75rem",
              fontSize: "0.9rem",
              color: "var(--color-muted)",
              borderLeft: "4px solid var(--hub-sage)",
            }}
          >
            <strong style={{ color: "var(--hub-charcoal)" }}>Read-only thread.</strong> The author chose not to accept new comments here.
          </p>
        )}
        {user && !p.removedByAdmin && p.noReplies && isAdmin && (
          <p style={{ fontSize: "0.82rem", color: "var(--color-muted)", margin: "0 0 0.5rem" }}>
            As a moderator you can still post a comment if needed (e.g. official notice).
          </p>
        )}
        {user && !p.removedByAdmin && !replyGloballyDisabled && (
          <CompactCommentBar postId={numericId} parentId={null} onDone={reload} />
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
          {detail.comments.map((c) => (
            <CommentBranch
              key={c.id}
              node={c}
              depth={0}
              postAuthorId={p.authorUserId}
              postId={numericId}
              helpfulId={p.helpfulCommentId}
              currentUserId={user?.userId ?? null}
              isOpViewer={isOpViewer}
              isAdmin={isAdmin}
              threadRemoved={Boolean(p.removedByAdmin)}
              commentsLocked={replyGloballyDisabled}
              onThreadUpdated={(d) => setDetail(d)}
              onReload={reload}
              onMarkHelpful={markHelpful}
              onRequestDelete={(id, mode) => setDelComment({ id, mode })}
            />
          ))}
        </ul>
      </section>

      <HubConfirmDialog
        open={delComment != null}
        onOpenChange={(o) => !o && setDelComment(null)}
        title={delComment?.mode === "admin" ? "Remove this comment?" : "Delete your comment?"}
        description={
          delComment?.mode === "admin"
            ? "The comment will be hidden and shown as removed by a moderator."
            : "Your comment will be hidden for other readers."
        }
        confirmLabel={delComment?.mode === "admin" ? "Remove" : "Delete"}
        danger
        onConfirm={confirmDeleteComment}
      />
    </div>
  );
}

function CompactCommentBar({ postId, parentId, onDone }: { postId: number; parentId: number | null; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const t = text.trim();
    const files = fileRef.current?.files;
    const file = files && files[0] ? files[0] : null;
    if (!t && !file) return;
    setBusy(true);
    try {
      let attachmentUrl: string | null = null;
      if (file) attachmentUrl = await uploadForumImage(file);
      await api(`/api/hub/forum/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ parentId, body: t, attachmentUrl }),
      });
      setText("");
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="hub-forum-composer ph-surface">
      <input ref={fileRef} type="file" accept="image/*" className="hub-forum-composer-file" aria-label="Attach image" />
      <button type="button" className="ph-btn ph-btn-ghost hub-forum-composer-icon" onClick={() => fileRef.current?.click()} aria-label="Upload image">
        <ImagePlus size={20} />
      </button>
      <input
        className="ph-input hub-forum-composer-input"
        placeholder={parentId ? "Reply…" : "Write a comment…"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy}
      />
      <button type="button" className="ph-btn ph-btn-primary hub-forum-composer-send" disabled={busy} onClick={() => void submit()} aria-label="Send">
        <SendHorizontal size={18} />
      </button>
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
  threadRemoved,
  commentsLocked,
  onThreadUpdated,
  onReload,
  onMarkHelpful,
  onRequestDelete,
}: {
  node: ForumCommentJson;
  depth?: number;
  postAuthorId: number;
  postId: number;
  helpfulId: number | null;
  currentUserId: number | null;
  isOpViewer: boolean;
  isAdmin: boolean;
  threadRemoved: boolean;
  /** When true, member cannot add new replies (read-only thread). */
  commentsLocked: boolean;
  onThreadUpdated: (d: ForumPostDetailJson) => void;
  onReload: () => void;
  onMarkHelpful: (id: number) => void;
  onRequestDelete: (id: number, mode: "admin" | "self") => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(node.body);
  const isOp = node.authorUserId === postAuthorId;
  const isHelpful = helpfulId === node.id;
  const isOwn = currentUserId != null && currentUserId === node.authorUserId;
  const { openMedia } = useMediaLightbox();

  useEffect(() => {
    if (!editing) setEditDraft(node.body);
  }, [node.body, editing]);

  async function saveEdit() {
    const d = await api<ForumPostDetailJson>(`/api/hub/forum/comments/${node.id}`, {
      method: "PATCH",
      body: JSON.stringify({ body: editDraft }),
    });
    onThreadUpdated(d);
    setEditing(false);
  }

  const palette = ["var(--hub-salmon)", "var(--hub-sage)", "#c4b8a8", "#9a8f82"];
  const indent = palette[depth % palette.length];

  if (node.deleted) {
    return (
      <li style={{ marginBottom: "0.75rem" }}>
        <article
          className={clsx(
            "hub-forum-comment-card",
            depth > 0 && "hub-forum-comment-card--nested hub-forum-comment-nested",
          )}
          style={depth > 0 ? { ["--indent-color" as string]: indent } : undefined}
        >
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-muted)", fontStyle: "italic" }}>
            {node.deletedByAdmin ? "This comment was removed by a moderator." : "This comment was removed."}
          </p>
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
                threadRemoved={threadRemoved}
                commentsLocked={commentsLocked}
                onThreadUpdated={onThreadUpdated}
                onReload={onReload}
                onMarkHelpful={onMarkHelpful}
                onRequestDelete={onRequestDelete}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li style={{ marginBottom: "0.75rem" }}>
      <article
        className={clsx(
          "hub-forum-comment-card",
          depth > 0 && "hub-forum-comment-card--nested hub-forum-comment-nested",
        )}
        style={depth > 0 ? { ["--indent-color" as string]: indent } : undefined}
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
        {node.attachmentUrl && (
          <div style={{ marginBottom: "0.5rem" }}>
            <button
              type="button"
              onClick={() => openMedia(node.attachmentUrl!)}
              aria-label="View attachment"
              style={{
                border: "none",
                padding: 0,
                background: "transparent",
                cursor: "pointer",
                display: "block",
                borderRadius: 8,
              }}
            >
              {inferMediaLightboxKind(node.attachmentUrl) === "video" ? (
                <video
                  src={node.attachmentUrl}
                  muted
                  playsInline
                  preload="metadata"
                  style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, display: "block" }}
                />
              ) : (
                <img
                  src={node.attachmentUrl}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, display: "block" }}
                  loading="lazy"
                />
              )}
            </button>
          </div>
        )}
        {editing ? (
          <div style={{ marginBottom: "0.5rem" }}>
            <textarea className="ph-textarea" rows={3} value={editDraft} onChange={(e) => setEditDraft(e.target.value)} style={{ width: "100%" }} />
            <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem" }}>
              <button type="button" className="ph-btn ph-btn-primary" style={{ fontSize: "0.85rem" }} onClick={() => void saveEdit()}>
                Save
              </button>
              <button type="button" className="ph-btn ph-btn-ghost" style={{ fontSize: "0.85rem" }} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p style={{ margin: "0 0 0.5rem", lineHeight: 1.55, fontSize: "0.92rem" }}>{node.body}</p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
          {currentUserId && !editing && !threadRemoved && !commentsLocked && (
            <button type="button" className="ph-btn ph-btn-ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "0.78rem" }} onClick={() => setReplyOpen((v) => !v)}>
              {replyOpen ? "Cancel" : "Reply"}
            </button>
          )}
          {isOwn && !editing && !threadRemoved && (
            <>
              <button type="button" className="ph-btn ph-btn-ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "0.78rem" }} onClick={() => setEditing(true)}>
                <Pencil size={14} style={{ marginRight: "0.25rem" }} aria-hidden />
                Edit
              </button>
              <button
                type="button"
                className="ph-btn ph-btn-ghost"
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.78rem", color: "#b42318" }}
                onClick={() => onRequestDelete(node.id, "self")}
              >
                <Trash2 size={14} style={{ marginRight: "0.25rem" }} aria-hidden />
                Delete
              </button>
            </>
          )}
          {isOpViewer && !isHelpful && !node.deleted && node.authorUserId !== postAuthorId && !threadRemoved && (
            <button type="button" className="ph-btn ph-btn-primary" style={{ padding: "0.2rem 0.55rem", fontSize: "0.78rem" }} onClick={() => onMarkHelpful(node.id)}>
              Mark helpful answer
            </button>
          )}
          {isAdmin && !isOwn && !threadRemoved && (
            <button
              type="button"
              className="ph-btn ph-btn-ghost"
              style={{ padding: "0.2rem 0.5rem", fontSize: "0.78rem", color: "#b42318" }}
              onClick={() => onRequestDelete(node.id, "admin")}
            >
              <Trash2 size={14} style={{ marginRight: "0.25rem" }} aria-hidden />
              Remove
            </button>
          )}
        </div>
        {replyOpen && currentUserId && !threadRemoved && !commentsLocked && (
          <div style={{ marginTop: "0.65rem" }}>
            <CompactCommentBar
              postId={postId}
              parentId={node.id}
              onDone={() => {
                setReplyOpen(false);
                onReload();
              }}
            />
          </div>
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
              threadRemoved={threadRemoved}
              commentsLocked={commentsLocked}
              onThreadUpdated={onThreadUpdated}
              onReload={onReload}
              onMarkHelpful={onMarkHelpful}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
