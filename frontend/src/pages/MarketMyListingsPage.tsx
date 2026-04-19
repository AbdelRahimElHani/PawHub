import { Edit3, ExternalLink, Gift, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useThreadNotifications } from "../notifications/ThreadNotificationContext";
import type { PawListingDto } from "../types";

function StatusPill({ status }: { status: PawListingDto["pawStatus"] }) {
  const map: Record<string, string> = {
    Available: "pm-status pm-status--ok",
    Pending: "pm-status pm-status--pending",
    Sold: "pm-status pm-status--sold",
    Expired: "pm-status pm-status--pending",
  };
  return <span className={map[status] ?? "pm-status"}>{status}</span>;
}

export function MarketMyListingsPage() {
  const [rows, setRows] = useState<PawListingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { listingUnreadCount } = useThreadNotifications();

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    void api<PawListingDto[]>("/api/paw/listings/mine")
      .then(setRows)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Could not load your listings."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function removeListing(id: number) {
    if (!window.confirm("Delete this listing permanently? This only works if there are no orders yet.")) return;
    setDeletingId(id);
    setErr(null);
    try {
      await api(`/api/paw/listings/${id}`, { method: "DELETE" });
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {listingUnreadCount > 0 && (
        <div className="ph-surface pm-inbox-banner" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>You have new messages about your listings.</p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--color-muted)" }}>
            Open Messaging (dock or full screen) to reply to buyers about their orders.
          </p>
          <Link className="ph-btn ph-btn-primary" style={{ marginTop: "0.75rem" }} to="/messages">
            Open messages
          </Link>
        </div>
      )}

      {err && (
        <p style={{ color: "#b42318", marginBottom: "1rem" }} role="alert">
          {err}
        </p>
      )}

      {loading ? (
        <p style={{ color: "var(--color-muted)" }}>Loading your listings…</p>
      ) : rows.length === 0 ? (
        <div className="ph-surface" style={{ padding: "2rem", textAlign: "center", color: "var(--color-muted)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>You have not listed anything yet.</p>
          <Link className="ph-btn ph-btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }} to="/market/new">
            List your first item
          </Link>
        </div>
      ) : (
        <ul className="pm-my-list">
          {rows.map((l) => {
            const thumb = l.imageUrls?.[0] ?? l.photoUrl;
            const canEdit = l.pawStatus === "Available";
            return (
              <li key={l.id} className="ph-surface pm-my-list__row">
                <div className="pm-my-list__thumb">
                  {thumb ? <img src={thumb} alt="" /> : <span>🐾</span>}
                </div>
                <div className="pm-my-list__body">
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.4rem" }}>
                    <strong className="pm-my-list__title">{l.title}</strong>
                    <StatusPill status={l.pawStatus} />
                    {l.isFree && (
                      <span className="pm-badge pm-badge--free">
                        <Gift size={11} /> FREE
                      </span>
                    )}
                  </div>
                  <div className="pm-my-list__price">
                    {l.isFree ? "FREE" : `$${(l.priceCents / 100).toFixed(2)}`}
                    {l.category && <span className="pm-my-list__meta"> · {l.category}</span>}
                  </div>
                  <div className="pm-my-list__meta" style={{ marginTop: "0.25rem" }}>
                    Stock {l.stockQuantity ?? 0}
                    {(l.soldQuantity ?? 0) > 0 ? ` · ${l.soldQuantity} sold` : ""}
                    {l.expiresAt ? (
                      <>
                        {" "}
                        · Ends {new Date(l.expiresAt).toLocaleDateString(undefined, { dateStyle: "short" })}
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="pm-my-list__actions">
                  <Link className="ph-btn ph-btn-ghost" to={`/market/${l.id}`} title="View public page">
                    <ExternalLink size={16} />
                  </Link>
                  {canEdit ? (
                    <Link className="ph-btn ph-btn-ghost" to={`/market/${l.id}/edit`} title="Edit">
                      <Edit3 size={16} />
                    </Link>
                  ) : null}
                  {canEdit ? (
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost"
                      title="Delete listing"
                      disabled={deletingId === l.id}
                      onClick={() => void removeListing(l.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
