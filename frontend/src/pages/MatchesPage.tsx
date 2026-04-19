import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { MatchSummaryDto } from "../types";

export function MatchesPage() {
  const [rows, setRows] = useState<MatchSummaryDto[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void api<MatchSummaryDto[]>("/api/matches")
      .then(setRows)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <div className="ph-surface" style={{ padding: "1.25rem" }}>
      <h2 style={{ marginTop: 0 }}>Your matches</h2>
      {err && <p style={{ color: "#b42318" }}>{err}</p>}
      {rows.length === 0 && !err && (
        <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--color-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🐾</div>
          <p>No matches yet — head to <Link to="/pawmatch">PawMatch</Link> to start swiping!</p>
        </div>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rows.map((m) => (
<<<<<<< HEAD
          <li key={m.matchId} className="ph-surface" style={{ padding: "0.9rem", marginBottom: "0.65rem" }}>
            <strong>
              {m.catAName} & {m.catBName}
            </strong>
            <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>With {m.otherOwnerName}</div>
            <Link className="ph-btn ph-btn-primary" style={{ marginTop: "0.5rem" }} to={`/messages/${m.threadId}`}>
              Open chat
=======
          <li
            key={m.matchId}
            className="ph-surface"
            style={{ padding: "1rem", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "1rem" }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: "var(--color-bg)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0,
            }}>
              🐱
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{m.catAName} ❤️ {m.catBName}</strong>
              <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>with {m.otherOwnerName}</div>
            </div>
            <Link className="ph-btn ph-btn-primary" style={{ flexShrink: 0 }} to={`/chat/${m.threadId}`}>
              Chat
>>>>>>> origin/PawMatch
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
