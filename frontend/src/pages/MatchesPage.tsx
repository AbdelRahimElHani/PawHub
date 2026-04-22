import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { CatDto, MatchSummaryDto } from "../types";

const STORAGE_KEY = "pawhub.matches.myCatId";

export function MatchesPage() {
  const [cats, setCats] = useState<CatDto[]>([]);
  const [rows, setRows] = useState<MatchSummaryDto[]>([]);
  const [myCatId, setMyCatId] = useState<number | "">("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      api<CatDto[]>("/api/cats").then(setCats).catch(() => setCats([])),
      api<MatchSummaryDto[]>("/api/matches")
        .then(setRows)
        .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed")),
    ]);
  }, []);

  useEffect(() => {
    if (cats.length !== 1) return;
    const only = cats[0].id;
    setMyCatId((prev) => (prev === "" ? only : prev));
  }, [cats]);

  useEffect(() => {
    if (typeof window === "undefined" || cats.length <= 1) return;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isFinite(id) || !cats.some((c) => c.id === id)) return;
    setMyCatId(id);
  }, [cats]);

  useEffect(() => {
    if (typeof window === "undefined" || cats.length <= 1) return;
    if (myCatId === "") {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, String(myCatId));
    }
  }, [cats.length, myCatId]);

  const filtered = useMemo(() => {
    if (myCatId === "") return [];
    return rows.filter((m) => m.myCatId === myCatId);
  }, [rows, myCatId]);

  const selectedCat = cats.find((c) => c.id === myCatId);

  return (
    <div className="ph-surface" style={{ padding: "1.25rem" }}>
      <h2 style={{ marginTop: 0 }}>Your matches</h2>

      {cats.length > 0 && (
        <label style={{ display: "block", marginBottom: "1.25rem" }}>
          <span style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600, fontSize: "0.9rem" }}>
            Show matches for
          </span>
          <select
            className="ph-select"
            value={myCatId}
            onChange={(e) => setMyCatId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select your cat…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.gender ? (c.gender === "MALE" ? " (♂)" : " (♀)") : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      {cats.length === 0 && !err && (
        <p style={{ color: "var(--color-muted)" }}>
          Add a cat profile first, then start matching from{" "}
          <Link to="/pawmatch">PawMatch</Link>.
        </p>
      )}

      {err && <p style={{ color: "#b42318" }}>{err}</p>}

      {cats.length > 1 && myCatId === "" && (
        <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--color-muted)" }}>
          <p style={{ margin: 0 }}>Choose which cat above to see their matches.</p>
        </div>
      )}

      {myCatId !== "" && filtered.length === 0 && !err && (
        <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--color-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🐾</div>
          <p>
            No matches for <strong>{selectedCat?.name ?? "this cat"}</strong> yet — head to{" "}
            <Link to="/pawmatch">PawMatch</Link> and swipe as them!
          </p>
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {filtered.map((m) => (
          <li
            key={m.matchId}
            className="ph-surface"
            style={{ padding: "1rem", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "1rem" }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--color-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                flexShrink: 0,
              }}
            >
              🐱
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>
                {m.catAName} ❤️ {m.catBName}
              </strong>
              <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>With {m.otherOwnerName}</div>
            </div>
            <Link className="ph-btn ph-btn-primary" style={{ flexShrink: 0 }} to={`/messages/${m.threadId}`}>
              Open chat
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
