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
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rows.map((m) => (
          <li key={m.matchId} className="ph-surface" style={{ padding: "0.9rem", marginBottom: "0.65rem" }}>
            <strong>
              {m.catAName} & {m.catBName}
            </strong>
            <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>With {m.otherOwnerName}</div>
            <Link className="ph-btn ph-btn-primary" style={{ marginTop: "0.5rem" }} to={`/messages/${m.threadId}`}>
              Open chat
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
