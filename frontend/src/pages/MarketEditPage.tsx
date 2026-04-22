import { ArrowLeft, CheckCircle, Gift, Upload, XCircle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { LocationPickerMap } from "../market/LocationPickerMap";
import type { LatLng } from "../market/LocationPickerMap";
import type { ReverseGeocodedPlace } from "../market/reverseGeocodeNominatim";
import { useCountriesCitiesCatalog } from "../market/useCountriesCitiesCatalog";
import type { PawListingDto } from "../types";
import { PAW_CATEGORIES } from "../types";

type CatCheckResult =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "passed"; reason: string }
  | { state: "failed"; reason: string }
  | { state: "skipped" }
  | { state: "unavailable"; message: string };

type ListingLocationMode = "dropdown" | "map";

export function MarketEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingCover, setExistingCover] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [category, setCategory] = useState("");
  const [locationMode, setLocationMode] = useState<ListingLocationMode>("dropdown");
  const [ddCountry, setDdCountry] = useState("");
  const [ddCity, setDdCity] = useState("");
  const [pin, setPin] = useState<LatLng | null>(null);
  const [mapPlace, setMapPlace] = useState<ReverseGeocodedPlace | null>(null);
  const [stockQuantity, setStockQuantity] = useState("1");

  const [catCheck, setCatCheck] = useState<CatCheckResult>({ state: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const { countries, getCities, loading: catLoading, hasData: catHasData, error: catErr } = useCountriesCitiesCatalog();
  const ddCityOptions = useMemo(() => (ddCountry ? getCities(ddCountry) : []), [ddCountry, getCities]);

  const runCatCheck = useCallback(async (file: File) => {
    setCatCheck({ state: "checking" });
    try {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);
      if (title) form.append("title", title);
      if (description) form.append("description", description);

      const res = await fetch("/api/paw/cat-check", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        setCatCheck({
          state: "unavailable",
          message: "Preview check could not run. The image will be verified again when you save.",
        });
        return;
      }
      const data = (await res.json()) as { isCatRelated: boolean; reason: string };

      if (data.reason?.toLowerCase().includes("skipped")) {
        setCatCheck({ state: "skipped" });
      } else if (data.isCatRelated) {
        setCatCheck({ state: "passed", reason: data.reason });
      } else {
        setCatCheck({ state: "failed", reason: data.reason });
      }
    } catch {
      setCatCheck({
        state: "unavailable",
        message: "Preview check could not run. The image will be verified again when you save.",
      });
    }
  }, [title, description]);

  useEffect(() => {
    const file = fileRef.current?.files?.[0];
    if (!file || !previewUrl) return;
    const tid = window.setTimeout(() => {
      void runCatCheck(file);
    }, 650);
    return () => window.clearTimeout(tid);
  }, [title, description, previewUrl, runCatCheck]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const l = await api<PawListingDto>(`/api/paw/listings/${id}`);
        if (cancelled) return;
        if (user && l.sellerUserId !== user.userId) {
          nav("/market/selling", { replace: true });
          return;
        }
        if (l.pawStatus !== "Available") {
          setLoadErr("Only listings that are still available can be edited here.");
          setLoaded(true);
          return;
        }
        setTitle(l.title);
        setDescription(l.description ?? "");
        setPrice(l.isFree ? "" : (l.priceCents / 100).toFixed(2));
        setIsFree(l.isFree);
        setCategory(l.category ?? "");
        const country = l.country ?? "";
        const city = l.city ?? "";
        const region = l.region ?? "";
        const text = l.cityText ?? [city, region, country].filter(Boolean).join(", ");
        setDdCountry(country);
        setDdCity(city);
        if (l.latitude != null && l.longitude != null) {
          setPin({ lat: l.latitude, lng: l.longitude });
          setMapPlace({
            city,
            region,
            country,
            cityText: text,
          });
          setLocationMode("map");
        } else {
          setPin(null);
          setMapPlace(null);
          setLocationMode("dropdown");
        }
        const cover = l.imageUrls?.[0] ?? l.photoUrl ?? null;
        setExistingCover(cover);
        setStockQuantity(String(l.stockQuantity ?? 1));
        setLoaded(true);
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "Failed to load listing.");
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user, nav]);

  function handleLocationChange(pos: LatLng, place: ReverseGeocodedPlace | null) {
    setPin(pos);
    setMapPlace(place);
  }

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      setCatCheck({ state: "idle" });
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || catCheck.state === "failed") return;

    setErr(null);
    setSubmitting(true);
    const token = getToken();

    try {
      const stock = Math.min(99999, Math.max(1, Math.floor(Number(stockQuantity) || 1)));

      let reqCity: string;
      let reqRegion: string | null;
      let reqCountry: string;
      let reqCityText: string | null;
      let reqLat: number | null;
      let reqLng: number | null;

      if (locationMode === "dropdown") {
        if (!catHasData || catErr) {
          setErr("Location list is still loading or unavailable. Wait a moment or refresh.");
          setSubmitting(false);
          return;
        }
        const cities = getCities(ddCountry);
        if (!ddCountry.trim() || !ddCity.trim() || !cities.includes(ddCity)) {
          setErr("Choose your country and city from the dropdowns.");
          setSubmitting(false);
          return;
        }
        reqCity = ddCity.trim();
        reqRegion = null;
        reqCountry = ddCountry.trim();
        reqCityText = `${ddCity.trim()}, ${ddCountry.trim()}`;
        reqLat = null;
        reqLng = null;
      } else {
        if (!pin) {
          setErr("Click the map to set where you are offering this item.");
          setSubmitting(false);
          return;
        }
        if (!mapPlace?.country?.trim() || !mapPlace.city?.trim()) {
          setErr(
            "Could not read city and country from that spot. Move the pin slightly or use the country and city dropdowns.",
          );
          setSubmitting(false);
          return;
        }
        reqCity = mapPlace.city.trim();
        reqRegion = mapPlace.region?.trim() ? mapPlace.region.trim() : null;
        reqCountry = mapPlace.country.trim();
        reqCityText = mapPlace.cityText?.trim() ? mapPlace.cityText.trim() : null;
        reqLat = pin.lat;
        reqLng = pin.lng;
      }

      const body = {
        title,
        description: description || null,
        priceCents: isFree ? 0 : Math.round(Number(price) * 100),
        isFree,
        category: category || null,
        city: reqCity,
        region: reqRegion,
        country: reqCountry,
        cityText: reqCityText,
        latitude: reqLat,
        longitude: reqLng,
        stockQuantity: stock,
      };

      const res = await fetch(`/api/paw/listings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (res.status === 422) {
        const json = (await res.json()) as { error: string; reason: string };
        if (json.error === "CAT_CHECK_FAILED") {
          setCatCheck({ state: "failed", reason: json.reason });
          return;
        }
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }

      const file = fileRef.current?.files?.[0];
      if (file) {
        const form = new FormData();
        form.append("file", file);
        const photoRes = await fetch(`/api/paw/listings/${id}/photo`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (photoRes.status === 422) {
          const json = (await photoRes.json()) as { reason?: string };
          setCatCheck({
            state: "failed",
            reason: json.reason ?? "This photo is not allowed on Paw Market.",
          });
          return;
        }
        if (!photoRes.ok) {
          const j = (await photoRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? photoRes.statusText);
        }
      }

      nav(`/market/${id}`);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Update failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = catCheck.state !== "failed" && catCheck.state !== "checking" && !submitting && loaded && !loadErr;

  if (loadErr) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem" }}>
        <p style={{ color: "#b42318" }}>{loadErr}</p>
        <Link to="/market/selling">Back to my listings</Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-muted)" }}>
        <span className="pm-paw-spin">🐾</span>
        <p>Loading listing…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", paddingBottom: "2rem" }}>
      <Link
        to="/market/selling"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          color: "var(--color-muted)",
          fontSize: "0.88rem",
          marginBottom: "1rem",
        }}
      >
        <ArrowLeft size={14} /> Back to my listings
      </Link>

      <div className="ph-surface" style={{ padding: "1.75rem" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
          Edit listing
        </h2>
        <p style={{ margin: "0 0 1.5rem", color: "var(--color-muted)", fontSize: "0.9rem" }}>
          Replace the photo only if you want a new image; otherwise your current photo stays. Text changes may trigger
          Cat-Check when you upload a new image.
        </p>

        <form onSubmit={onSubmit} className="ph-grid" style={{ gap: "1.1rem" }}>
          <div>
            <span className="ph-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Photo (optional new image)
            </span>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: previewUrl || existingCover ? 0 : "1.5rem",
                border: `2px ${
                  catCheck.state === "failed"
                    ? "solid #fca5a5"
                    : catCheck.state === "passed"
                      ? "solid #6ee7b7"
                      : "dashed var(--color-border)"
                }`,
                borderRadius: 12,
                cursor: "pointer",
                background: "#fafaf9",
                overflow: "hidden",
              }}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="New preview" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
              ) : existingCover ? (
                <img src={existingCover} alt="Current" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
              ) : (
                <>
                  <Upload size={22} color="var(--color-muted)" />
                  <span style={{ fontSize: "0.88rem", color: "var(--color-muted)" }}>Click to choose a new photo</span>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </label>

            {catCheck.state === "checking" && (
              <div className="pm-ai-banner" style={{ marginTop: "0.6rem" }}>
                <span className="pm-paw-spin">🐾</span>
                <div>
                  <strong style={{ fontSize: "0.9rem" }}>Scanning new image…</strong>
                </div>
              </div>
            )}
            {catCheck.state === "passed" && (
              <div
                style={{
                  marginTop: "0.6rem",
                  background: "#f0fdf4",
                  border: "1.5px solid #6ee7b7",
                  borderRadius: 10,
                  padding: "0.75rem 1rem",
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                }}
              >
                <CheckCircle size={18} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong style={{ color: "#065f46", fontSize: "0.88rem" }}>Cat-ness OK</strong>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#047857" }}>{catCheck.reason}</p>
                </div>
              </div>
            )}
            {catCheck.state === "failed" && (
              <div
                style={{
                  marginTop: "0.6rem",
                  background: "#fff1f0",
                  border: "1.5px solid #fca5a5",
                  borderRadius: 10,
                  padding: "0.75rem 1rem",
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                }}
              >
                <XCircle size={18} color="#b91c1c" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong style={{ color: "#b91c1c", fontSize: "0.88rem" }}>Cat-Check failed</strong>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#7f1d1d" }}>{catCheck.reason}</p>
                </div>
              </div>
            )}
          </div>

          <label>
            <span className="ph-label">Title *</span>
            <input className="ph-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label>
            <span className="ph-label">Category</span>
            <select className="ph-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select a category…</option>
              {PAW_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="ph-label">Description</span>
            <textarea
              className="ph-textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            <label className="pm-toggle">
              <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
              <Gift size={15} />
              Give it away for free
            </label>
            {!isFree && (
              <label>
                <span className="ph-label">Price (USD) *</span>
                <input
                  className="ph-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required={!isFree}
                />
              </label>
            )}
            <label>
              <span className="ph-label">Quantity remaining *</span>
              <input
                className="ph-input"
                type="number"
                min={1}
                max={99999}
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                required
              />
              <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
                Cannot be less than units already sold.
              </span>
            </label>
          </div>

          <div>
            <span className="ph-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Item location
            </span>
            <p style={{ margin: "0 0 0.6rem", fontSize: "0.82rem", color: "var(--color-muted)", lineHeight: 1.4 }}>
              Use the country and city list, or a map pin — city, region (when available), and country are saved from the
              map automatically.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem" }}>
              <label className="pm-toggle" style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name="editListingLocMode"
                  checked={locationMode === "dropdown"}
                  onChange={() => setLocationMode("dropdown")}
                />
                Country and city list
              </label>
              <label className="pm-toggle" style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name="editListingLocMode"
                  checked={locationMode === "map"}
                  onChange={() => setLocationMode("map")}
                />
                Map pin
              </label>
            </div>

            {locationMode === "dropdown" && (
              <div style={{ display: "grid", gap: "0.65rem" }}>
                {catLoading && !catHasData && (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-muted)" }}>Loading countries and cities…</p>
                )}
                {catErr && (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#b42318" }}>{catErr} — switch to map pin instead.</p>
                )}
                {catHasData && !catErr && (
                  <>
                    <label>
                      <span className="ph-label">Country</span>
                      <select
                        className={`ph-select${!ddCountry ? " ph-select--placeholder" : ""}`}
                        style={{ width: "100%", fontSize: "0.92rem" }}
                        value={ddCountry}
                        onChange={(e) => {
                          setDdCountry(e.target.value);
                          setDdCity("");
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
                    </label>
                    <label>
                      <span className="ph-label">City</span>
                      <select
                        className={`ph-select${!ddCity ? " ph-select--placeholder" : ""}`}
                        style={{ width: "100%", fontSize: "0.92rem" }}
                        value={ddCity}
                        onChange={(e) => setDdCity(e.target.value)}
                        disabled={!ddCountry}
                        aria-label="City"
                      >
                        <option value="">City</option>
                        {ddCityOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
              </div>
            )}

            {locationMode === "map" && (
              <div>
                <LocationPickerMap initial={pin ?? undefined} onLocationChange={handleLocationChange} />
                {mapPlace?.cityText ? (
                  <p
                    style={{
                      margin: "0.4rem 0 0",
                      fontSize: "0.82rem",
                      color: "var(--color-primary-dark)",
                      fontWeight: 600,
                    }}
                  >
                    📌 Saved as: {mapPlace.cityText}
                  </p>
                ) : pin ? (
                  <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "#b42318" }}>
                    Could not read address — try moving the pin slightly.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {err && (
            <div style={{ color: "#b42318", fontSize: "0.9rem", padding: "0.5rem 0.75rem", background: "#fff1f0", borderRadius: 8 }}>
              {err}
            </div>
          )}

          <button className="ph-btn ph-btn-primary" type="submit" disabled={!canSubmit} style={{ fontSize: "1rem", padding: "0.75rem" }}>
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
