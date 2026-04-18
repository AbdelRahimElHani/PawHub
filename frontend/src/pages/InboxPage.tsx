import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ThreadSummaryDto } from "../types";

export function InboxPage() {
  const [threads, setThreads] = useState<ThreadSummaryDto[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void api<ThreadSummaryDto[]>("/api/chat/threads")
      .then(setThreads)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <div className="ph-surface" style={{ padding: "1.25rem" }}>
      <h2 style={{ marginTop: 0 }}>Inbox</h2>
      {err && <p style={{ color: "#b42318" }}>{err}</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {threads.map((t) => (
          <li key={t.id} className="ph-surface" style={{ padding: "0.85rem", marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>{t.type}</div>
            <strong>{t.otherDisplayName}</strong>
            <div>
              <Link className="ph-btn ph-btn-primary" style={{ marginTop: "0.35rem", display: "inline-block" }} to={`/chat/${t.id}`}>
                Open
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
