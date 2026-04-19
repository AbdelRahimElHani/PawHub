import { ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";
import { useForum } from "../../context/ForumContext";
import { useAuth } from "../../../auth/AuthContext";

type Props = { postId: string };

export function VoteCluster({ postId }: Props) {
  const { user } = useAuth();
  const { getPost, votePost, getUserVote } = useForum();
  const post = getPost(postId);
  const v = getUserVote(postId);
  if (!post) return null;

  return (
    <div className="hub-vote-col" aria-label={user ? "Post score — vote" : "Post score — sign in to vote"}>
      <button
        type="button"
        className={clsx("ph-btn ph-btn-ghost", v === 1 && "hub-vote--active")}
        style={{ padding: "0.2rem", minWidth: "auto", borderRadius: "8px", opacity: user ? 1 : 0.45 }}
        aria-label="Upvote"
        aria-pressed={v === 1}
        disabled={!user}
        title={user ? undefined : "Sign in to vote"}
        onClick={() => user && votePost(postId, "up")}
      >
        <ChevronUp size={18} />
      </button>
      <span aria-live="polite">{post.score}</span>
      <button
        type="button"
        className={clsx("ph-btn ph-btn-ghost", v === -1 && "hub-vote--active")}
        style={{ padding: "0.2rem", minWidth: "auto", borderRadius: "8px", opacity: user ? 1 : 0.45 }}
        aria-label="Downvote"
        aria-pressed={v === -1}
        disabled={!user}
        title={user ? undefined : "Sign in to vote"}
        onClick={() => user && votePost(postId, "down")}
      >
        <ChevronDown size={18} />
      </button>
    </div>
  );
}
