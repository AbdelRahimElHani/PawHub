import {
  ArrowLeft,
  Gift,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Star,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { HubConfirmDialog } from "../hub/components/HubConfirmDialog";
import { ProductLocationMap } from "../market/ProductLocationMap";
import { formatDistance, haversineKm } from "../market/haversine";
import { useGeolocation } from "../market/useGeolocation";
import type { PawListingDto, PawReviewDto, PlaceOrderResponse } from "../types";

function listingPastExpiry(listing: PawListingDto): boolean {
  if (!listing.expiresAt) return false;
  const t = new Date(listing.expiresAt).getTime();
  return !Number.isNaN(t) && t <= Date.now();
}

function isListingBuyable(listing: PawListingDto): boolean {
  if (listing.pawStatus !== "Available") return false;
  if (listing.stockQuantity <= 0) return false;
  if (listingPastExpiry(listing)) return false;
  return true;
}

function StarRating({ value, count }: { value: number; count: number }) {
  const full = Math.floor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem" }}>
      <span className="pm-stars">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s}>{s <= full ? "★" : "☆"}</span>
        ))}
      </span>
      <span style={{ color: "var(--color-muted)" }}>
        {value.toFixed(1)} ({count} review{count !== 1 ? "s" : ""})
      </span>
    </div>
  );
}

function ReviewCard({ review }: { review: PawReviewDto }) {
  return (
    <div
      className="ph-surface"
      style={{ padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {review.reviewerAvatarUrl ? (
          <img src={review.reviewerAvatarUrl} alt="" className="pm-seller__avatar" style={{ width: 28, height: 28 }} />
        ) : (
          <div
            className="pm-seller__avatar"
            style={{ width: 28, height: 28, background: "#eef6f4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem" }}
          >
            🐱
          </div>
        )}
        <strong style={{ fontSize: "0.88rem" }}>{review.reviewerDisplayName}</strong>
        <span className="pm-stars" style={{ marginLeft: "auto" }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s}>{s <= review.rating ? "★" : "☆"}</span>
          ))}
        </span>
      </div>
      {review.comment && (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text)" }}>
          {review.comment}
        </p>
      )}
    </div>
  );
}

function BuyModal({
  listingTitle,
  maxQuantity,
  onClose,
  onConfirm,
  loading,
}: {
  listingTitle: string;
  maxQuantity: number;
  onClose: () => void;
  onConfirm: (phone: string, quantity: number) => void;
  loading: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (phone.trim()) onConfirm(phone.trim(), Math.min(maxQuantity, Math.max(1, quantity)));
  }

  return (
    <div className="pm-modal-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <h3
          style={{
            margin: "0 0 0.25rem",
            fontFamily: "var(--font-display)",
            color: "var(--color-primary-dark)",
          }}
        >
          🐾 Place Order
        </h3>
        <p style={{ margin: "0 0 1.25rem", color: "var(--color-muted)", fontSize: "0.9rem" }}>
          For <strong>{listingTitle}</strong>. We'll send your phone number to the seller so
          they can arrange delivery.
        </p>
        <form onSubmit={handleSubmit} className="ph-grid">
          <label>
            <span className="ph-label">Your phone number</span>
            <input
              className="ph-input"
              type="tel"
              placeholder="+1 555-000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />
          </label>
          {maxQuantity > 1 && (
            <label>
              <span className="ph-label">Quantity (max {maxQuantity})</span>
              <input
                className="ph-input"
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                required
              />
            </label>
          )}
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              type="submit"
              className="ph-btn ph-btn-primary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? "Sending…" : "Confirm & Notify Seller"}
            </button>
            <button type="button" className="ph-btn ph-btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MarketDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { position } = useGeolocation();

  const [listing, setListing] = useState<PawListingDto | null>(null);
  const [reviews, setReviews] = useState<PawReviewDto[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [confirmAdminDel, setConfirmAdminDel] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<PawListingDto>(`/api/paw/listings/${id}`)
      .then((l) => {
        setListing(l);
        return api<PawReviewDto[]>(`/api/paw/users/${l.sellerUserId}/reviews`);
      })
      .then(setReviews)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed to load."));
  }, [id]);

  async function handleBuy(phone: string, quantity: number) {
    if (!id) return;
    setOrderLoading(true);
    setErr(null);
    try {
      const r = await api<PlaceOrderResponse>(`/api/paw/listings/${id}/buy`, {
        method: "POST",
        body: JSON.stringify({ buyerPhone: phone, quantity }),
      });
      setShowBuyModal(false);
      nav(`/messages/${r.threadId}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to place order.");
    } finally {
      setOrderLoading(false);
    }
  }

  if (!listing) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-muted)" }}>
        {err ? (
          <p style={{ color: "#b42318" }}>{err}</p>
        ) : (
          <>
            <span className="pm-paw-spin">🐾</span>
            <p>Loading…</p>
          </>
        )}
      </div>
    );
  }

  const images = listing.imageUrls?.length ? listing.imageUrls : listing.photoUrl ? [listing.photoUrl] : [];
  const isFree = listing.isFree;
  const isSelf = user?.userId === listing.sellerUserId;
  const isAvailable = listing.pawStatus === "Available";
  const showExpired =
    listing.pawStatus === "Expired" || listingPastExpiry(listing);
  const buyable = isListingBuyable(listing);

  const distKm =
    position && listing.latitude != null && listing.longitude != null
      ? haversineKm(position.lat, position.lng, listing.latitude, listing.longitude)
      : null;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: "2rem" }}>
      <Link
        to="/market"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          color: "var(--color-muted)",
          fontSize: "0.88rem",
          marginBottom: "1rem",
        }}
      >
        <ArrowLeft size={14} /> Back to Paw Market
      </Link>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
        {isSelf && (
          <>
            <Link className="ph-btn ph-btn-ghost" to="/market/selling">
              My listings
            </Link>
            {isAvailable && !showExpired ? (
              <Link className="ph-btn ph-btn-primary" to={`/market/${listing.id}/edit`}>
                Edit listing
              </Link>
            ) : null}
          </>
        )}
        {user?.role === "ADMIN" && (
          <>
            <button
              type="button"
              className="ph-btn ph-btn-ghost"
              style={{ color: "#b42318", borderColor: "rgba(180,35,24,0.35)" }}
              onClick={() => setConfirmAdminDel(true)}
            >
              <Trash2 size={16} style={{ marginRight: "0.35rem" }} aria-hidden />
              Remove listing
            </button>
            <HubConfirmDialog
              open={confirmAdminDel}
              onOpenChange={setConfirmAdminDel}
              title="Remove this listing?"
              description="This permanently removes the seller’s item from Paw Market."
              confirmLabel="Remove"
              danger
              onConfirm={async () => {
                await api(`/api/admin/paw/listings/${listing.id}`, { method: "DELETE" });
                nav("/market");
              }}
            />
          </>
        )}
      </div>

      <div className="ph-surface" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* ── Image gallery ─────────────────────────────────── */}
        {images.length > 0 && (
          <div>
            <img
              src={images[activeImg]}
              alt={listing.title}
              style={{
                width: "100%",
                maxHeight: 400,
                objectFit: "cover",
                borderRadius: 14,
                background: "#eef6f4",
              }}
            />
            {images.length > 1 && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
                {images.map((url, i) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    onClick={() => setActiveImg(i)}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      objectFit: "cover",
                      cursor: "pointer",
                      border: i === activeImg ? "2px solid var(--color-primary)" : "2px solid transparent",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Title + badges ────────────────────────────────── */}
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
            {isFree && (
              <span className="pm-badge pm-badge--free">
                <Gift size={12} /> Cat-Blessing: FREE
              </span>
            )}
            {listing.category && (
              <span className="pm-badge pm-badge--category">{listing.category}</span>
            )}
            {(listing.pawStatus !== "Available" || showExpired) && (
              <span
                className={`pm-badge${
                  listing.pawStatus === "Sold" || showExpired
                    ? " pm-badge--sold"
                    : " pm-badge--pending"
                }`}
              >
                {listing.pawStatus === "Sold"
                  ? "Sold"
                  : showExpired
                    ? "Expired"
                    : listing.pawStatus}
              </span>
            )}
          </div>

          <h1
            style={{
              margin: "0 0 0.35rem",
              fontFamily: "var(--font-display)",
              fontSize: "1.65rem",
              color: "var(--color-text)",
            }}
          >
            {listing.title}
          </h1>

          <div className={`pm-price${isFree ? " pm-price--free" : ""}`} style={{ fontSize: "1.5rem" }}>
            {isFree ? "FREE" : `$${(listing.priceCents / 100).toFixed(2)}`}
          </div>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.88rem", color: "var(--color-muted)" }}>
            {listing.stockQuantity > 0 ? (
              <>
                <strong style={{ color: "var(--color-text)" }}>{listing.stockQuantity}</strong> in stock
                {listing.soldQuantity > 0 ? (
                  <>
                    {" "}
                    · <strong style={{ color: "var(--color-text)" }}>{listing.soldQuantity}</strong> sold
                  </>
                ) : null}
              </>
            ) : (
              <>Sold out</>
            )}
            {listing.expiresAt && (
              <>
                {" "}
                · Listing ends{" "}
                <time dateTime={listing.expiresAt}>
                  {new Date(listing.expiresAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </time>
              </>
            )}
          </p>
        </div>

        {/* ── Description ───────────────────────────────────── */}
        {listing.description && (
          <p style={{ margin: 0, lineHeight: 1.6, color: "var(--color-text)" }}>
            {listing.description}
          </p>
        )}

        {/* ── Seller card ───────────────────────────────────── */}
        <div
          style={{
            background: "#fafaf8",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "0.85rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          {listing.sellerAvatarUrl ? (
            <img src={listing.sellerAvatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#eef6f4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              🐱
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              {listing.sellerDisplayName}
              {listing.sellerVerifiedMeow && (
                <span
                  className="pm-badge pm-badge--verified"
                  title="Verified Meow — 5+ completed sales with 4.5★+"
                >
                  🐾 Verified Meow
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
              {listing.sellerCompletedSales} completed sale{listing.sellerCompletedSales !== 1 ? "s" : ""}
            </div>
          </div>
          {reviews.length > 0 && (
            <div style={{ marginLeft: "auto" }}>
              <StarRating value={listing.averageRating} count={listing.reviewCount} />
            </div>
          )}
        </div>

        {/* ── Location ──────────────────────────────────────── */}
        {(listing.cityText || distKm != null) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.88rem",
              color: "var(--color-muted)",
            }}
          >
            <MapPin size={14} />
            {listing.cityText && <span>{listing.cityText}</span>}
            {distKm != null && (
              <span style={{ color: "var(--color-primary-dark)", fontWeight: 600 }}>
                · {formatDistance(distKm)}
              </span>
            )}
          </div>
        )}

        {listing.latitude != null && listing.longitude != null && (
          <ProductLocationMap lat={listing.latitude} lng={listing.longitude} />
        )}

        {/* ── Action buttons ────────────────────────────────── */}
        {err && <p style={{ margin: 0, color: "#b42318", fontSize: "0.9rem" }}>{err}</p>}

        {!isSelf && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {buyable && (
              <button
                type="button"
                className="ph-btn ph-btn-primary"
                onClick={() => setShowBuyModal(true)}
                style={{ flex: 1, minWidth: 160 }}
              >
                <ShoppingBag size={16} /> Buy Now
              </button>
            )}
            <Link
              to="/messages"
              className="ph-btn ph-btn-ghost"
              style={{ flex: 1, minWidth: 140, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
              onClick={async (e) => {
                e.preventDefault();
                try {
                  const r = await api<{ threadId: number }>(`/api/market/listings/${id}/thread`, { method: "POST" });
                  nav(`/messages/${r.threadId}`);
                } catch {}
              }}
            >
              <MessageCircle size={15} /> Message Seller
            </Link>
          </div>
        )}

        {/* ── Reviews ───────────────────────────────────────── */}
        {reviews.length > 0 && (
          <div>
            <h3
              style={{
                margin: "0 0 0.75rem",
                fontFamily: "var(--font-display)",
                fontSize: "1rem",
                color: "var(--color-primary-dark)",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <Star size={15} /> Seller Reviews
            </h3>
            <div className="ph-grid" style={{ gap: "0.6rem" }}>
              {reviews.slice(0, 5).map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showBuyModal && (
        <BuyModal
          listingTitle={listing.title}
          maxQuantity={Math.max(1, listing.stockQuantity)}
          onClose={() => setShowBuyModal(false)}
          onConfirm={(phone, qty) => void handleBuy(phone, qty)}
          loading={orderLoading}
        />
      )}
    </div>
  );
}
