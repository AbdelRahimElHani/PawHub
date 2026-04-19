import { Gift, MapPin, Search, Sliders, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { HubConfirmDialog } from "../hub/components/HubConfirmDialog";
import { haversineKm, formatDistance } from "../market/haversine";
import { useGeolocation } from "../market/useGeolocation";
import type { PawCategory, PawListingDto } from "../types";
import { PAW_CATEGORIES } from "../types";

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  return (
    <span className="pm-stars" aria-label={`${value.toFixed(1)} stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s}>{s <= full ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

function ListingCard({
  listing,
  userLat,
  userLng,
  isAdmin,
  onAdminDeleted,
}: {
  listing: PawListingDto;
  userLat: number | null;
  userLng: number | null;
  isAdmin?: boolean;
  onAdminDeleted?: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const isFree = listing.isFree;
  const cover = listing.imageUrls?.[0] ?? listing.photoUrl;

  const distKm =
    userLat != null && userLng != null && listing.latitude != null && listing.longitude != null
      ? haversineKm(userLat, userLng, listing.latitude, listing.longitude)
      : null;

  return (
    <div style={{ position: "relative" }}>
      {isAdmin && (
        <>
          <button
            type="button"
            className="ph-btn ph-btn-ghost"
            title="Remove listing (moderator)"
            aria-label="Remove listing"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirmDel(true);
            }}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 3,
              padding: "0.35rem",
              minWidth: "auto",
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
            }}
          >
            <Trash2 size={16} color="#b42318" />
          </button>
          <HubConfirmDialog
            open={confirmDel}
            onOpenChange={setConfirmDel}
            title="Remove this listing?"
            description="The seller’s item will be permanently removed from Paw Market (including order history tied to it)."
            confirmLabel="Remove listing"
            danger
            onConfirm={async () => {
              await api(`/api/admin/paw/listings/${listing.id}`, { method: "DELETE" });
              onAdminDeleted?.();
            }}
          />
        </>
      )}
      <Link to={`/market/${listing.id}`} className={`pm-card${isFree ? " pm-card--free" : ""}`} style={{ display: "block" }}>
      {cover ? (
        <img src={cover} alt={listing.title} className="pm-card__img" />
      ) : (
        <div className="pm-card__img-placeholder">🐾</div>
      )}
      <div className="pm-card__body">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", alignItems: "center" }}>
          {isFree && (
            <span className="pm-badge pm-badge--free">
              <Gift size={11} /> Cat-Blessing: FREE
            </span>
          )}
          {listing.category && (
            <span className="pm-badge pm-badge--category">{listing.category}</span>
          )}
        </div>

        <p className="pm-card__title">{listing.title}</p>

        <div className={`pm-price${isFree ? " pm-price--free" : ""}`}>
          {isFree ? "FREE" : `$${(listing.priceCents / 100).toFixed(2)}`}
        </div>

        {listing.stockQuantity > 1 && (
          <div style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginTop: "0.15rem" }}>
            {listing.stockQuantity} in stock
            {(listing.soldQuantity ?? 0) > 0 ? ` · ${listing.soldQuantity} sold` : ""}
          </div>
        )}

        {listing.reviewCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem" }}>
            <StarRating value={listing.averageRating} />
            <span style={{ color: "var(--color-muted)" }}>({listing.reviewCount})</span>
          </div>
        )}

        <div className="pm-seller">
          {listing.sellerAvatarUrl ? (
            <img src={listing.sellerAvatarUrl} alt="" className="pm-seller__avatar" />
          ) : (
            <div
              className="pm-seller__avatar"
              style={{ background: "#eef6f4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem" }}
            >
              🐱
            </div>
          )}
          <span>{listing.sellerDisplayName}</span>
          {listing.sellerVerifiedMeow && (
            <span className="pm-badge pm-badge--verified" title="Verified Meow – 5+ sales, 4.5★+">
              🐾
            </span>
          )}
        </div>

        {(distKm != null || listing.cityText) && (
          <div className="pm-distance">
            <MapPin size={11} />
            {distKm != null ? formatDistance(distKm) : listing.cityText}
          </div>
        )}
      </div>
    </Link>
    </div>
  );
}

/** Browse and buy: filters + listing grid (Paw Market Shop tab). */
export function MarketBrowsePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [all, setAll] = useState<PawListingDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<PawCategory | "">("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [maxDistKm, setMaxDistKm] = useState(100);

  const { position } = useGeolocation();

  const loadListings = () => {
    setLoading(true);
    api<PawListingDto[]>("/api/paw/listings")
      .then(setAll)
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadListings();
  }, []);

  const filtered = all.filter((l) => {
    if (freeOnly && !l.isFree) return false;
    if (activeCategory && l.category !== activeCategory) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (position && l.latitude != null && l.longitude != null) {
      const d = haversineKm(position.lat, position.lng, l.latitude, l.longitude);
      if (d > maxDistKm) return false;
    }
    return true;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "1.5rem", alignItems: "start" }}>
      <aside className="ph-surface pm-sidebar" style={{ padding: "1.25rem" }}>
        <div className="pm-filter-section">
          <span className="pm-filter-label">Search</span>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
            />
            <input
              className="ph-input"
              style={{ paddingLeft: "2rem", fontSize: "0.88rem" }}
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="pm-filter-section">
          <span className="pm-filter-label">Category</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            <button
              type="button"
              className={`pm-pill${activeCategory === "" ? " pm-pill--active" : ""}`}
              onClick={() => setActiveCategory("")}
            >
              All
            </button>
            {PAW_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`pm-pill${activeCategory === c ? " pm-pill--active" : ""}`}
                onClick={() => setActiveCategory(activeCategory === c ? "" : c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="pm-filter-section">
          <label className="pm-toggle">
            <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
            Show Free Only 🎁
          </label>
        </div>

        {position && (
          <div className="pm-filter-section">
            <span className="pm-filter-label">
              <Sliders size={12} style={{ verticalAlign: "middle" }} /> Distance
            </span>
            <input
              type="range"
              className="pm-slider"
              min={1}
              max={100}
              value={maxDistKm}
              onChange={(e) => setMaxDistKm(Number(e.target.value))}
            />
            <span style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>
              Within {maxDistKm} km
            </span>
          </div>
        )}
      </aside>

      <main>
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "4rem",
              gap: "1rem",
              color: "var(--color-muted)",
            }}
          >
            <span className="pm-paw-spin">🐾</span>
            <span>Loading listings…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="ph-surface"
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--color-muted)",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🐱</div>
            <p style={{ margin: 0, fontWeight: 600 }}>No listings match your filters.</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.88rem" }}>
              Try adjusting the category or distance slider.
            </p>
          </div>
        ) : (
          <div className="pm-grid">
            {filtered.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                userLat={position?.lat ?? null}
                userLng={position?.lng ?? null}
                isAdmin={isAdmin}
                onAdminDeleted={loadListings}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
