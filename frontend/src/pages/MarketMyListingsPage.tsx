import { BadgeCheck, Edit3, ExternalLink, Gift, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { HubConfirmDialog } from "../hub/components/HubConfirmDialog";
import { useThreadNotifications } from "../notifications/ThreadNotificationContext";
import type { PawListingDto } from "../types";

function StatusPill({ status }: { status: PawListingDto["pawStatus"] }) {
  const map: Record<string, string> = {
    Draft: "pm-status pm-status--pending",
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
  const [markSoldId, setMarkSoldId] = useState<number | null>(null);
  const [markSoldLoading, setMarkSoldLoading] = useState(false);
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

  async function markSoldOffMarket(id: number) {
    setMarkSoldLoading(true);
    setErr(null);
    try {
      const updated = await api<PawListingDto>(`/api/paw/listings/${id}/sold-off-market`, { method: "POST" });
      setRows((r) => {
        const next = r.map((x) => (x.id === id ? updated : x));
        return [...next].sort((a, b) => {
          const rank = (x: PawListingDto) => (x.pawStatus === "Available" ? 0 : 1);
          const d = rank(a) - rank(b);
          if (d !== 0) return d;
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
      });
      setMarkSoldId(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update listing.");
    } finally {
      setMarkSoldLoading(false);
    }
  }

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
      <HubConfirmDialog
        open={markSoldId != null}
        onOpenChange={(o) => {
          if (!o) setMarkSoldId(null);
        }}
        title="Mark this listing as sold?"
        description="It disappears from Paw Market search and stays here with status Sold — your record of what you listed and that it sold (nothing is deleted)."
        confirmLabel={markSoldLoading ? "Saving…" : "Mark as sold"}
        danger={false}
        onConfirm={async () => {
          if (markSoldId == null) return;
          await markSoldOffMarket(markSoldId);
        }}
      />

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
            const canEdit = l.pawStatus === "Available" || l.pawStatus === "Draft";
            const canMarkSold = l.pawStatus === "Available";
            return (
              <li
                key={l.id}
                className={`ph-surface pm-my-list__row${l.pawStatus === "Sold" ? " pm-my-list__row--sold" : ""}`}
              >
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
                    {l.pawStatus === "Sold" ? (
                      <span style={{ color: "var(--color-muted)" }}>
                        {(l.soldQuantity ?? 0) > 0
                          ? `Off market · ${l.soldQuantity} sold via Paw Market`
                          : "Off market — marked sold (kept for your history)"}
                      </span>
                    ) : (
                      <>
                        Stock {l.stockQuantity ?? 0}
                        {(l.soldQuantity ?? 0) > 0 ? ` · ${l.soldQuantity} sold via Paw Market` : ""}
                        {l.expiresAt ? (
                          <>
                            {" "}
                            · Ends {new Date(l.expiresAt).toLocaleDateString(undefined, { dateStyle: "short" })}
                          </>
                        ) : null}
                      </>
                    )}
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
                  {canMarkSold ? (
                    <button
                      type="button"
                      className="ph-btn ph-btn-ghost"
                      title="Mark as sold — remove from market, keep in your list"
                      disabled={markSoldLoading}
                      onClick={() => setMarkSoldId(l.id)}
                    >
                      <BadgeCheck size={16} />
                    </button>
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
