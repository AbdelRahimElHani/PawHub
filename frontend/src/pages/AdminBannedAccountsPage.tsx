import { Ban, Link as LinkIcon, Store } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { BannedUserAdminDto } from "../types";

export function AdminBannedAccountsPage() {
  const [rows, setRows] = useState<BannedUserAdminDto[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(null);
    void api<BannedUserAdminDto[]>("/api/admin/users/market-or-adopt-banned")
      .then(setRows)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Could not load banned accounts."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function liftMarket(userId: number) {
    const key = `${userId}-m`;
    setBusyId(key);
    setErr(null);
    try {
      await api(`/api/admin/users/${userId}/lift-paw-market-ban`, { method: "POST" });
      load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not lift Paw Market ban.");
    } finally {
      setBusyId(null);
    }
  }

  async function liftAdopt(userId: number) {
    const key = `${userId}-a`;
    setBusyId(key);
    setErr(null);
    try {
      await api(`/api/admin/users/${userId}/lift-paw-adopt-ban`, { method: "POST" });
      load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not lift Paw Adopt ban.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ph-surface" style={{ padding: "clamp(1rem, 2vw, 1.75rem)", borderRadius: 20, maxWidth: 960 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <Ban size={26} strokeWidth={2} aria-hidden style={{ color: "#b42318" }} />
        <h1 style={{ fontFamily: "var(--font-display)", margin: 0, flex: 1, minWidth: 0 }}>
          Paw Market &amp; Paw Adopt — banned accounts
        </h1>
        <Link className="ph-btn ph-btn-ghost" to="/adopt/admin/shelters">
          ← Shelter admin
        </Link>
      </div>
      <p style={{ color: "var(--color-muted)", lineHeight: 1.55, marginTop: 0 }}>
        Accounts blocked from listing or buying on <strong>Paw Market</strong>, or from publishing on{" "}
        <strong>Paw Adopt</strong>, after moderation. Remove a ban when the issue is resolved.
      </p>

      {err ? (
        <p role="alert" style={{ color: "#b42318", marginTop: "0.75rem" }}>
          {err}
        </p>
      ) : null}

      {rows.length === 0 && !err ? (
        <p style={{ marginTop: "1.25rem", color: "var(--color-muted)" }}>No market or adopt listing bans on file.</p>
      ) : (
        <div style={{ marginTop: "1.25rem", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                <th style={{ padding: "0.5rem 0.65rem" }}>User</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Account</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Restrictions</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.65rem", verticalAlign: "top" }}>
                    <strong>{r.displayName}</strong>
                    <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", marginTop: "0.2rem" }}>
                      {r.email}
                    </div>
                    <Link
                      to={`/users/${r.userId}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.78rem",
                        marginTop: "0.35rem",
                        color: "var(--color-primary-dark)",
                      }}
                    >
                      <LinkIcon size={12} aria-hidden />
                      Profile
                    </Link>
                  </td>
                  <td style={{ padding: "0.65rem", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {r.accountType}
                  </td>
                  <td style={{ padding: "0.65rem", verticalAlign: "top" }}>
                    <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                      {r.pawMarketBanned ? (
                        <li>
                          <Store size={14} style={{ verticalAlign: "middle", marginRight: "0.2rem" }} aria-hidden />
                          Paw Market banned
                        </li>
                      ) : null}
                      {r.pawAdoptBanned ? <li>Paw Adopt listings banned</li> : null}
                    </ul>
                  </td>
                  <td style={{ padding: "0.65rem", verticalAlign: "top" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" }}>
                      {r.pawMarketBanned ? (
                        <button
                          type="button"
                          className="ph-btn ph-btn-ghost"
                          style={{ fontSize: "0.82rem", color: "#166534", borderColor: "rgba(22,101,52,0.35)" }}
                          disabled={busyId !== null}
                          onClick={() => void liftMarket(r.userId)}
                        >
                          {busyId === `${r.userId}-m` ? "Saving…" : "Remove Paw Market ban"}
                        </button>
                      ) : null}
                      {r.pawAdoptBanned ? (
                        <button
                          type="button"
                          className="ph-btn ph-btn-ghost"
                          style={{ fontSize: "0.82rem", color: "#166534", borderColor: "rgba(22,101,52,0.35)" }}
                          disabled={busyId !== null}
                          onClick={() => void liftAdopt(r.userId)}
                        >
                          {busyId === `${r.userId}-a` ? "Saving…" : "Remove Paw Adopt ban"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
