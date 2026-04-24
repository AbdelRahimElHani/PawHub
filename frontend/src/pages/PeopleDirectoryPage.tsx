import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Sparkles, Users } from "lucide-react";
import { api } from "../api/client";
import type { DiscoverUserDto, FriendDirectoryUserDto, ThreadIdResponse } from "../types";
import { UserChip } from "../components/social/UserChip";

type Tab = "friends" | "discover";

async function openDm(userId: number): Promise<ThreadIdResponse> {
  return api<ThreadIdResponse>(`/api/chat/dm/${userId}`, { method: "POST" });
}

export function PeopleDirectoryPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendDirectoryUserDto[]>([]);
  const [discover, setDiscover] = useState<DiscoverUserDto[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [f, d] = await Promise.all([
        api<FriendDirectoryUserDto[]>("/api/social/directory/friends"),
        api<DiscoverUserDto[]>("/api/social/directory/discover"),
      ]);
      setFriends(Array.isArray(f) ? f : []);
      setDiscover(Array.isArray(d) ? d : []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not load directory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const suggestedTail = discover.slice(0, 8);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "1rem 1rem 2.5rem" }}>
      <h1
        style={{
          margin: "0 0 0.35rem",
          fontFamily: "var(--font-display)",
          fontSize: "1.65rem",
          color: "var(--color-primary-dark)",
        }}
      >
        People
      </h1>
      <p style={{ margin: "0 0 1.25rem", color: "var(--color-muted)", fontSize: "0.92rem" }}>
        Friends you have added (and who added you), and suggestions based on your profile and mutual connections.
      </p>

      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className={tab === "friends" ? "ph-btn ph-btn-primary" : "ph-btn ph-btn-ghost"}
          onClick={() => setTab("friends")}
        >
          <Users size={16} aria-hidden style={{ marginRight: "0.35rem", verticalAlign: "middle" }} />
          Friends ({friends.length})
        </button>
        <button
          type="button"
          className={tab === "discover" ? "ph-btn ph-btn-primary" : "ph-btn ph-btn-ghost"}
          onClick={() => setTab("discover")}
        >
          <Sparkles size={16} aria-hidden style={{ marginRight: "0.35rem", verticalAlign: "middle" }} />
          Discover
        </button>
      </div>

      {err && <p style={{ color: "#b42318", marginBottom: "1rem" }}>{err}</p>}

      {loading ? (
        <p style={{ color: "var(--color-muted)" }}>Loading…</p>
      ) : (
        <>
          {tab === "friends" ? (
            friends.length === 0 ? (
              <p style={{ color: "var(--color-muted)" }}>
                No friends yet. Try the{" "}
                <button
                  type="button"
                  onClick={() => setTab("discover")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--color-primary-dark)",
                    textDecoration: "underline",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  Discover
                </button>{" "}
                tab or visit someone&apos;s profile from Paw Market or the hub.
              </p>
            ) : (
              <ul className="ph-surface" style={{ listStyle: "none", margin: 0, padding: 0, borderRadius: 14 }}>
                {friends.map((f) => (
                  <li
                    key={f.userId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <UserChip userId={f.userId} displayName={f.displayName} avatarUrl={f.avatarUrl} />
                      {(f.profileCity || f.profileRegion) && (
                        <div style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginTop: "0.2rem" }}>
                          {[f.profileCity, f.profileRegion].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost"
                      style={{ flexShrink: 0 }}
                      onClick={() =>
                        void (async () => {
                          try {
                            const r = await openDm(f.userId);
                            navigate(`/messages/${r.threadId}`);
                          } catch {
                            /* ignore */
                          }
                        })()
                      }
                    >
                      <MessageCircle size={16} aria-hidden /> Message
                    </button>
                    <Link className="ph-btn ph-btn-ghost" style={{ flexShrink: 0 }} to={`/users/${f.userId}`}>
                      Profile
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : discover.length === 0 ? (
            <p style={{ color: "var(--color-muted)" }}>No suggestions right now. Fill in city or region on your account to improve matches.</p>
          ) : (
            <ul className="ph-surface" style={{ listStyle: "none", margin: 0, padding: 0, borderRadius: 14 }}>
              {discover.map((d) => (
                <li
                  key={d.userId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid var(--color-border)",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <UserChip userId={d.userId} displayName={d.displayName} avatarUrl={d.avatarUrl} />
                    <div style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginTop: "0.2rem" }}>
                      Score {d.score}
                      {d.mutualFriendsCount > 0 ? ` · ${d.mutualFriendsCount} mutual friend${d.mutualFriendsCount !== 1 ? "s" : ""}` : null}
                      {d.relationship === "INCOMING_PENDING" ? " · sent you a request" : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ph-btn ph-btn-ghost"
                    style={{ flexShrink: 0 }}
                    onClick={() =>
                      void (async () => {
                        try {
                          const r = await openDm(d.userId);
                          navigate(`/messages/${r.threadId}`);
                        } catch {
                          /* ignore */
                        }
                      })()
                    }
                  >
                    <MessageCircle size={16} aria-hidden /> Message
                  </button>
                  <Link className="ph-btn ph-btn-ghost" style={{ flexShrink: 0 }} to={`/users/${d.userId}`}>
                    {d.relationship === "INCOMING_PENDING" ? "Respond" : "Profile"}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {tab === "friends" && suggestedTail.length > 0 ? (
            <section
              className="ph-surface"
              style={{
                marginTop: "1.35rem",
                padding: "1rem 1.1rem",
                borderRadius: 14,
              }}
            >
              <h2
                style={{
                  margin: "0 0 0.35rem",
                  fontFamily: "var(--font-display)",
                  fontSize: "1.05rem",
                  color: "var(--color-primary-dark)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Sparkles size={18} aria-hidden />
                Suggested for you
              </h2>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
                People you aren&apos;t friends with yet — open a profile to add them. Full ranked list is in{" "}
                <button
                  type="button"
                  onClick={() => setTab("discover")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--color-primary-dark)",
                    textDecoration: "underline",
                    cursor: "pointer",
                    font: "inherit",
                    fontWeight: 600,
                  }}
                >
                  Discover
                </button>
                .
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {suggestedTail.map((d, i) => (
                  <li
                    key={d.userId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.65rem",
                      padding: "0.5rem 0",
                      borderTop: i === 0 ? undefined : "1px solid var(--color-border)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <UserChip userId={d.userId} displayName={d.displayName} avatarUrl={d.avatarUrl} size="sm" />
                    </div>
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost"
                      style={{ fontSize: "0.82rem", padding: "0.25rem 0.55rem", flexShrink: 0 }}
                      onClick={() =>
                        void (async () => {
                          try {
                            const r = await openDm(d.userId);
                            navigate(`/messages/${r.threadId}`);
                          } catch {
                            /* ignore */
                          }
                        })()
                      }
                    >
                      <MessageCircle size={14} aria-hidden style={{ verticalAlign: "middle", marginRight: "0.2rem" }} />
                      Message
                    </button>
                    <Link className="ph-btn ph-btn-ghost" style={{ fontSize: "0.82rem", padding: "0.25rem 0.55rem" }} to={`/users/${d.userId}`}>
                      Profile
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
