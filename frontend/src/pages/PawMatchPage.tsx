import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { CatCardDto, CatDto, SwipeResponse } from "../types";

const GENDER_LABEL: Record<string, string> = { MALE: "♂ Male", FEMALE: "♀ Female" };

const BEHAVIOR_SHORT: Record<string, string> = {
  PLAYFUL: "Playful",
  CALM: "Calm",
  CUDDLY: "Cuddly",
  INDEPENDENT: "Independent",
  CURIOUS: "Curious",
  CHILL: "Chill",
};

function CatAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 16 }}
      />
    );
  }
  return (
    <div style={{
      width: "100%", aspectRatio: "1/1", borderRadius: 16,
      background: "var(--color-bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "0.5rem",
    }}>
      <span style={{ fontSize: "4rem" }}>🐱</span>
      <span style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>No photo yet</span>
    </div>
  );
}

export function PawMatchPage() {
  const [cats, setCats] = useState<CatDto[]>([]);
  const [myCatId, setMyCatId] = useState<number | "">("");
  const [card, setCard] = useState<CatCardDto>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [matched, setMatched] = useState(false);
  const [matchThreadId, setMatchThreadId] = useState<number | null>(null);

  useEffect(() => {
    void api<CatDto[]>("/api/cats").then(setCats).catch(() => setCats([]));
  }, []);

  async function loadCandidate() {
    if (!myCatId) return;
    setMsg(null);
    setMatched(false);
    setMatchThreadId(null);
    try {
      const c = await api<CatCardDto>(`/api/pawmatch/candidates?myCatId=${myCatId}`);
      setCard(c);
      if (!c) {
        setMsg(
          "No cats to show right now — widen gender, age, vibe, or breed filters on My Cats, or check back later. (Both cats must fit each other's preferences.)",
        );
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to load candidate");
    }
  }

  useEffect(() => {
    if (myCatId) void loadCandidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCatId]);

  async function swipe(direction: "LIKE" | "PASS") {
    if (!myCatId || !card) return;
    setMsg(null);
    try {
      const res = await api<SwipeResponse>("/api/pawmatch/swipes", {
        method: "POST",
        body: JSON.stringify({ myCatId, targetCatId: card.id, direction }),
      });
      if (res.matched && res.threadId) {
        setMatched(true);
        setMatchThreadId(res.threadId);
      }
      await loadCandidate();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Swipe failed");
    }
  }

  const selectedCat = cats.find((c) => c.id === myCatId);

  return (
    <div className="ph-surface" style={{ padding: "1.5rem", maxWidth: 480, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>PawMatch</h2>

      <label style={{ display: "block", marginBottom: "1.25rem" }}>
        <span style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, fontSize: "0.9rem" }}>Swiping as</span>
        <select
          className="ph-select"
          value={myCatId}
          onChange={(e) => setMyCatId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Select your cat…</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.gender ? ` (${c.gender === "MALE" ? "♂" : "♀"})` : ""}
            </option>
          ))}
        </select>
        {selectedCat?.gender === null && myCatId && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: "0.35rem" }}>
            Tip: set your cat's gender in <Link to="/cats">My Cats</Link> to enable gender-based matching.
          </p>
        )}
      </label>

      {matched && matchThreadId && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14,
          padding: "1rem", marginBottom: "1rem", textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>🎉 It's a match!</div>
          <div style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            You can find it in your Matches tab.
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="ph-btn ph-btn-primary" to="/matches">View matches</Link>
            <Link className="ph-btn ph-btn-ghost" to={`/messages/${matchThreadId}`}>Open chat</Link>
          </div>
        </div>
      )}

      {msg && !matched && <p style={{ color: "var(--color-muted)", textAlign: "center" }}>{msg}</p>}

      {card && (
        <div style={{ textAlign: "center" }}>
          <div className="ph-surface" style={{ padding: "1rem", borderRadius: 22, overflow: "hidden" }}>
            <CatAvatar name={card.name} photoUrl={card.coverPhotoUrl} />
            <h3 style={{ marginBottom: "0.2rem", marginTop: "0.75rem" }}>{card.name}</h3>
            <div style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginBottom: "0.35rem" }}>
              {card.gender && <span style={{ marginRight: "0.5rem" }}>{GENDER_LABEL[card.gender]}</span>}
              {card.behavior && (
                <span style={{ marginRight: "0.5rem" }}>{BEHAVIOR_SHORT[card.behavior] ?? card.behavior}</span>
              )}
              {card.breed ?? "Unknown breed"}
              {card.ageMonths != null && ` · ${card.ageMonths} mo`}
            </div>
            {card.bio && <p style={{ textAlign: "left", margin: "0.5rem 0" }}>{card.bio}</p>}
            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
              Owner: {card.ownerDisplayName}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
            <button
              type="button"
              className="ph-btn ph-btn-ghost"
              style={{ flex: 1, padding: "0.65rem", fontSize: "1.1rem" }}
              onClick={() => void swipe("PASS")}
            >
              👎 Pass
            </button>
            <button
              type="button"
              className="ph-btn ph-btn-primary"
              style={{ flex: 1, padding: "0.65rem", fontSize: "1.1rem" }}
              onClick={() => void swipe("LIKE")}
            >
              ❤️ Like
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
