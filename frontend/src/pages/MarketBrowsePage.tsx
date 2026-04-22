import { Gift, MapPin, Search, Sliders, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { HubConfirmDialog } from "../hub/components/HubConfirmDialog";
import { haversineKm, formatDistance } from "../market/haversine";
import { useCountriesCitiesCatalog } from "../market/useCountriesCitiesCatalog";
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
    <div className="pm-card-outer">
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
    </div>
  );
}

const LS_MARKET_CITY = "pawhub_market_buyer_city";
const LS_MARKET_REGION = "pawhub_market_buyer_region";
const LS_MARKET_COUNTRY = "pawhub_market_buyer_country";

function readSavedBuyerArea() {
  const city = (localStorage.getItem(LS_MARKET_CITY) ?? "").trim();
  const country = (localStorage.getItem(LS_MARKET_COUNTRY) ?? "").trim();
  return {
    pickerCountry: country,
    /** City is only valid when country is saved (dropdown-only flow). */
    pickerCity: country ? city : "",
  };
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

  const initLoc = useMemo(() => readSavedBuyerArea(), []);
  const [pickerCountry, setPickerCountry] = useState(initLoc.pickerCountry);
  const [pickerCity, setPickerCity] = useState(initLoc.pickerCity);
  const [areaApplyHint, setAreaApplyHint] = useState<string | null>(null);

  const [appliedCity, setAppliedCity] = useState(() => localStorage.getItem(LS_MARKET_CITY) ?? "");
  const [appliedRegion, setAppliedRegion] = useState(() => localStorage.getItem(LS_MARKET_REGION) ?? "");

  const { position } = useGeolocation();
  const { countries, getCities, loading: catalogLoading, error: catalogError, hasData } = useCountriesCitiesCatalog();

  const cityOptions = useMemo(() => (pickerCountry ? getCities(pickerCountry) : []), [pickerCountry, getCities]);

  useEffect(() => {
    if (!pickerCountry || !pickerCity || !hasData) return;
    const list = getCities(pickerCountry);
    if (!list.includes(pickerCity)) setPickerCity("");
  }, [pickerCountry, pickerCity, hasData, getCities]);

  const loadListings = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const c = appliedCity.trim();
    const r = appliedRegion.trim();
    if (c) params.set("city", c);
    if (r) params.set("region", r);
    const qs = params.toString();
    api<PawListingDto[]>(`/api/paw/listings${qs ? `?${qs}` : ""}`)
      .then(setAll)
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  }, [appliedCity, appliedRegion]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  function applyBuyerLocation() {
    setAreaApplyHint(null);
    if (catalogError || !hasData) {
      setAreaApplyHint("Location list is not available. Refresh the page and try again.");
      return;
    }
    const country = pickerCountry.trim();
    const city = pickerCity.trim();
    if (!country || !city) {
      setAreaApplyHint("Choose a country, then pick a city from the dropdown.");
      return;
    }
    const allowed = getCities(country);
    if (!allowed.includes(city)) {
      setAreaApplyHint("Pick a city from the list for that country.");
      return;
    }
    localStorage.setItem(LS_MARKET_COUNTRY, country);
    localStorage.setItem(LS_MARKET_CITY, city);
    localStorage.setItem(LS_MARKET_REGION, "");
    setAppliedCity(city);
    setAppliedRegion("");
  }

  function clearBuyerLocation() {
    setPickerCountry("");
    setPickerCity("");
    setAreaApplyHint(null);
    localStorage.removeItem(LS_MARKET_CITY);
    localStorage.removeItem(LS_MARKET_REGION);
    localStorage.removeItem(LS_MARKET_COUNTRY);
    setAppliedCity("");
    setAppliedRegion("");
  }

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

        <div className="pm-filter-section">
          <span className="pm-filter-label">
            <MapPin size={12} style={{ verticalAlign: "middle" }} /> My area (listings)
          </span>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "var(--color-muted)", lineHeight: 1.35 }}>
            Choose your <strong>country</strong>, then a <strong>city</strong> from the list so spelling matches sellers. Leave
            empty and clear to see all areas.
          </p>

          {catalogLoading && !hasData && (
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "var(--color-muted)" }}>Loading location list…</p>
          )}
          {catalogError && (
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "#b42318", lineHeight: 1.35 }}>
              {catalogError} — area filter is unavailable until this loads.
            </p>
          )}

          {hasData && !catalogError && (
            <>
              <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.78rem", fontWeight: 600 }}>
                Country
              </label>
              <select
                className={`ph-select${!pickerCountry ? " ph-select--placeholder" : ""}`}
                style={{ width: "100%", fontSize: "0.88rem", marginBottom: "0.55rem" }}
                value={pickerCountry}
                onChange={(e) => {
                  setPickerCountry(e.target.value);
                  setPickerCity("");
                }}
                aria-label="Country"
              >
                <option value="">Country</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {pickerCountry ? (
                <>
                  <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.78rem", fontWeight: 600 }}>
                    City
                  </label>
                  <select
                    className={`ph-select${!pickerCity ? " ph-select--placeholder" : ""}`}
                    style={{ width: "100%", fontSize: "0.88rem", marginBottom: "0.5rem" }}
                    value={pickerCity}
                    onChange={(e) => setPickerCity(e.target.value)}
                    aria-label="City"
                  >
                    <option value="">City</option>
                    {cityOptions.map((cityName) => (
                      <option key={cityName} value={cityName}>
                        {cityName}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.76rem", color: "var(--color-muted)" }}>Select a country to see cities.</p>
              )}
            </>
          )}

          {areaApplyHint && (
            <p style={{ margin: "0 0 0.45rem", fontSize: "0.78rem", color: "#b42318" }}>{areaApplyHint}</p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            <button type="button" className="ph-btn ph-btn-primary" style={{ fontSize: "0.82rem" }} onClick={applyBuyerLocation}>
              Apply area
            </button>
            <button type="button" className="ph-btn ph-btn-ghost" style={{ fontSize: "0.82rem" }} onClick={clearBuyerLocation}>
              Clear
            </button>
          </div>
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
              Try adjusting the category, your city filter, or distance slider.
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
