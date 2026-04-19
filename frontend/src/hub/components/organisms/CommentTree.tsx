import { CheckCircle2, Flag } from "lucide-react";
import { useState } from "react";
import type { ForumComment, ForumPost } from "../../types";
import { useForum } from "../../context/ForumContext";
import { UserBadges } from "../molecules/UserBadges";
import { useAuth } from "../../../auth/AuthContext";

const DEPTH_PALETTE = ["var(--hub-salmon)", "var(--hub-sage)", "#c4b8a8", "#9a8f82"];

type Props = {
  nodes: ForumComment[];
  depth: number;
  post: ForumPost;
  showHelpfulForOp?: boolean;
  onMarkHelpful?: (commentId: string) => void;
};

export function CommentTree({ nodes, depth, post, showHelpfulForOp, onMarkHelpful }: Props) {
  return (
    <ul className="hub-comment" style={{ paddingLeft: depth ? "0.5rem" : 0 }}>
      {nodes.map((c) => (
        <CommentNode key={c.id} c={c} depth={depth} post={post} showHelpfulForOp={showHelpfulForOp} onMarkHelpful={onMarkHelpful} />
      ))}
    </ul>
  );
}

function CommentNode({
  c,
  depth,
  post,
  showHelpfulForOp,
  onMarkHelpful,
}: {
  c: ForumComment;
  depth: number;
  post: ForumPost;
  showHelpfulForOp?: boolean;
  onMarkHelpful?: (commentId: string) => void;
}) {
  const { resolveUser, addComment } = useForum();
  const [reported, setReported] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { user } = useAuth();
  const author = resolveUser(c.authorId);
  const indent = DEPTH_PALETTE[depth % DEPTH_PALETTE.length];
  const isHelpful = post.helpfulCommentId === c.id;

  function submitReply(e: React.FormEvent) {
    e.preventDefault();
    const t = draft.trim();
    if (!t || !user) return;
    addComment(post.id, c.id, t);
    setDraft("");
    setReplyOpen(false);
  }

  return (
    <li className={depth ? "hub-comment-nested" : undefined}>
      <article style={{ ["--indent-color" as string]: indent }}>
        <header style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
          <strong style={{ fontSize: "0.9rem" }}>{author.displayName}</strong>
          <UserBadges badges={author.badges} />
          {c.authorId === post.authorId && <span className="hub-room-pill">OP</span>}
          {isHelpful && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.78rem", color: "var(--color-primary-dark)" }}>
              <CheckCircle2 size={14} aria-hidden /> Helpful answer
            </span>
          )}
          <time dateTime={c.createdAt} style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginLeft: "auto" }}>
            {new Date(c.createdAt).toLocaleString()}
          </time>
        </header>
        <p style={{ margin: "0 0 0.5rem", lineHeight: 1.55, fontSize: "0.92rem" }}>{c.body}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
          <button
            type="button"
            className="ph-btn ph-btn-ghost"
            style={{ padding: "0.2rem 0.5rem", fontSize: "0.78rem" }}
            onClick={() => setReported(true)}
            disabled={reported}
            aria-label="Report comment"
          >
            <Flag size={14} style={{ marginRight: "0.25rem" }} aria-hidden />
            {reported ? "Reported" : "Report"}
          </button>
          {user && (
            <button type="button" className="ph-btn ph-btn-ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "0.78rem" }} onClick={() => setReplyOpen((v) => !v)}>
              {replyOpen ? "Cancel" : "Reply"}
            </button>
          )}
          {showHelpfulForOp && onMarkHelpful && c.authorId !== post.authorId && !isHelpful && (
            <button
              type="button"
              className="ph-btn ph-btn-primary"
              style={{ padding: "0.2rem 0.55rem", fontSize: "0.78rem" }}
              onClick={() => onMarkHelpful(c.id)}
            >
              Mark helpful answer
            </button>
          )}
        </div>
        {replyOpen && user && (
          <form onSubmit={submitReply} style={{ marginTop: "0.65rem" }}>
            <textarea
              className="ph-textarea"
              rows={3}
              placeholder="Write a reply…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{ marginBottom: "0.5rem" }}
            />
            <button type="submit" className="ph-btn ph-btn-primary" style={{ fontSize: "0.85rem" }} disabled={!draft.trim()}>
              Post reply
            </button>
          </form>
        )}
      </article>
      {c.children.length > 0 && (
        <CommentTree nodes={c.children} depth={depth + 1} post={post} showHelpfulForOp={showHelpfulForOp} onMarkHelpful={onMarkHelpful} />
      )}
    </li>
  );
}
