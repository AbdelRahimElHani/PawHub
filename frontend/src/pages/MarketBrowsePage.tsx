import { Gift, MapPin, Search, Sliders } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
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
}: {
  listing: PawListingDto;
  userLat: number | null;
  userLng: number | null;
}) {
  const isFree = listing.isFree;
  const cover = listing.imageUrls?.[0] ?? listing.photoUrl;

  const distKm =
    userLat != null && userLng != null && listing.latitude != null && listing.longitude != null
      ? haversineKm(userLat, userLng, listing.latitude, listing.longitude)
      : null;

  return (
    <Link to={`/market/${listing.id}`} className={`pm-card${isFree ? " pm-card--free" : ""}`}>
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
  );
}

/** Browse and buy: filters + listing grid (Paw Market Shop tab). */
export function MarketBrowsePage() {
  const [all, setAll] = useState<PawListingDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<PawCategory | "">("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [maxDistKm, setMaxDistKm] = useState(100);

  const { position } = useGeolocation();

  useEffect(() => {
    setLoading(true);
    api<PawListingDto[]>("/api/paw/listings")
      .then(setAll)
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
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
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
