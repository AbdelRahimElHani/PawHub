import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { CatCardDto, CatDto, SwipeResponse } from "../types";

export function PawMatchPage() {
  const [cats, setCats] = useState<CatDto[]>([]);
  const [myCatId, setMyCatId] = useState<number | "">("");
  const [card, setCard] = useState<CatCardDto>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void api<CatDto[]>("/api/cats").then(setCats).catch(() => setCats([]));
  }, []);

  async function loadCandidate() {
    if (!myCatId) return;
    setMsg(null);
    try {
      const c = await api<CatCardDto>(`/api/pawmatch/candidates?myCatId=${myCatId}`);
      setCard(c);
      if (!c) setMsg("No more cats to show right now.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed");
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
        setMsg(`It is a match! Thread #${res.threadId} — open Inbox to chat.`);
      }
      await loadCandidate();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Swipe failed");
    }
  }

  return (
    <div className="ph-surface" style={{ padding: "1.5rem" }}>
      <h2 style={{ marginTop: 0 }}>PawMatch</h2>
      <label style={{ display: "block", marginBottom: "1rem" }}>
        Swiping as cat
        <select className="ph-select" value={myCatId} onChange={(e) => setMyCatId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Select…</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {msg && <p style={{ color: "var(--color-muted)" }}>{msg}</p>}
      {card && (
        <div style={{ maxWidth: 360, margin: "0 auto", textAlign: "center" }}>
          <div className="ph-surface" style={{ padding: "1rem", borderRadius: 22 }}>
            {card.coverPhotoUrl && <img src={card.coverPhotoUrl} alt="" style={{ width: "100%", borderRadius: 16 }} />}
            <h3 style={{ marginBottom: "0.25rem" }}>{card.name}</h3>
            <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
              {card.breed ?? "Unknown breed"} · {card.ageMonths != null ? `${card.ageMonths} mo` : "Age ?"}
            </div>
            <p style={{ textAlign: "left" }}>{card.bio}</p>
            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
              Human: {card.ownerDisplayName}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
            <button type="button" className="ph-btn ph-btn-ghost" onClick={() => void swipe("PASS")}>
              Pass
            </button>
            <button type="button" className="ph-btn ph-btn-primary" onClick={() => void swipe("LIKE")}>
              Like
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
