import { ArrowLeft, CheckCircle, Gift, Upload, XCircle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl, getToken } from "../api/client";
import { LocationPickerMap } from "../market/LocationPickerMap";
import type { LatLng } from "../market/LocationPickerMap";
import type { ReverseGeocodedPlace } from "../market/reverseGeocodeNominatim";
import { useCountriesCitiesCatalog } from "../market/useCountriesCitiesCatalog";
import { useGeolocation } from "../market/useGeolocation";
import type { PawListingDto } from "../types";
import { PAW_CATEGORIES } from "../types";

/** Step 1: image only (cat-related product photo). */
type CatCheckResult =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "passed"; reason: string }
  | { state: "failed"; reason: string }
  | { state: "skipped" }
  | { state: "unavailable"; message: string };

type ListingLocationMode = "dropdown" | "map";

export function MarketNewPage() {
  const nav = useNavigate();
  const { position: geoHint } = useGeolocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
  /** Step 2: full match at publish (image + title + description). */
  const [alignPhase, setAlignPhase] = useState<"idle" | "matching" | "failed">("idle");
  const [alignReason, setAlignReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { countries, getCities, loading: catLoading, hasData: catHasData, error: catErr } = useCountriesCitiesCatalog();
  const ddCityOptions = useMemo(() => (ddCountry ? getCities(ddCountry) : []), [ddCountry, getCities]);

  function handleLocationChange(pos: LatLng, place: ReverseGeocodedPlace | null) {
    setPin(pos);
    setMapPlace(place);
  }

  // ── Step 1: image-only check (cat-related product photo) ─────────────────
  const runImageCatCheck = useCallback(async (file: File) => {
    setCatCheck({ state: "checking" });
    try {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(apiUrl("/api/paw/cat-check-image"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        setCatCheck({
          state: "unavailable",
          message: "Image preview could not run. The photo is still checked when you upload and before going live.",
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
        message: "Image preview could not run. The photo is still checked when you upload and before going live.",
      });
    }
  }, []);

  useEffect(() => {
    const file = fileRef.current?.files?.[0];
    if (!file || !previewUrl) return;
    const id = window.setTimeout(() => {
      void runImageCatCheck(file);
    }, 650);
    return () => window.clearTimeout(id);
  }, [previewUrl, runImageCatCheck]);

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      setCatCheck({ state: "idle" });
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  // ── Form submit ───────────────────────────────────────────────────────
  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (catCheck.state === "failed") return;

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr("Add a product photo to list on Paw Market.");
      return;
    }

    setErr(null);
    setAlignPhase("idle");
    setAlignReason(null);
    setSubmitting(true);

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

      const token = getToken();
      const res = await fetch(apiUrl("/api/paw/listings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }

      const created = (await res.json()) as PawListingDto;

      const form = new FormData();
      form.append("file", file);
      const photoRes = await fetch(apiUrl(`/api/paw/listings/${created.id}/photo`), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (photoRes.status === 422) {
        const json = (await photoRes.json()) as { error?: string; reason?: string };
        await fetch(apiUrl(`/api/paw/listings/${created.id}`), {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setCatCheck({
          state: "failed",
          reason: json.reason ?? "This photo is not allowed on Paw Market (cat-related product image required).",
        });
        setErr("The image did not pass the first check. Nothing was saved.");
        return;
      }
      if (!photoRes.ok) {
        const j = (await photoRes.json().catch(() => ({}))) as { error?: string };
        await fetch(apiUrl(`/api/paw/listings/${created.id}`), {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        throw new Error(j.error ?? photoRes.statusText);
      }

      setAlignPhase("matching");
      const pubRes = await fetch(apiUrl(`/api/paw/listings/${created.id}/publish`), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (pubRes.status === 422) {
        const json = (await pubRes.json()) as { error?: string; reason?: string };
        if (json.error === "CAT_CHECK_FAILED" && json.reason) {
          setAlignPhase("failed");
          setAlignReason(json.reason);
          setErr(
            "Title, description, and image could not be verified to match. Update the fields or photo above and try again.",
          );
          return;
        }
        setAlignPhase("failed");
        setAlignReason(json.reason ?? json.error ?? "Publish verification failed.");
        setErr("Could not publish this listing. You can try again, or go to My listings to open your draft.");
        return;
      }
      if (!pubRes.ok) {
        const j = (await pubRes.json().catch(() => ({}))) as { error?: string };
        setAlignPhase("failed");
        setErr(j.error ?? pubRes.statusText);
        return;
      }

      nav(`/market/${created.id}`);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    catCheck.state !== "failed" &&
    catCheck.state !== "checking" &&
    alignPhase !== "matching" &&
    !submitting;

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", paddingBottom: "2rem" }}>
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

      <div className="ph-surface" style={{ padding: "1.75rem" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
          🐾 List a Cat Item
        </h2>
        <p style={{ margin: "0 0 1.5rem", color: "var(--color-muted)", fontSize: "0.9rem" }}>
          <strong>Step 1</strong> — When you pick a photo, we check that it shows cat-related merchandise.{" "}
          <strong>Step 2</strong> — When you publish, we verify the title and description match that photo. Nothing
          goes on the public market until both steps pass.
        </p>

        <form onSubmit={onSubmit} className="ph-grid" style={{ gap: "1.1rem" }}>

          {/* ── Photo upload + live Cat-Check ───────────────────────── */}
          <div>
            <span className="ph-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Photo <span style={{ color: "#b42318" }}>*</span>
              <span style={{ fontWeight: 400, color: "var(--color-muted)" }}> — step 1: cat-related product image</span>
            </span>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: previewUrl ? 0 : "1.5rem",
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
                position: "relative",
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }}
                />
              ) : (
                <>
                  <Upload size={22} color="var(--color-muted)" />
                  <span style={{ fontSize: "0.88rem", color: "var(--color-muted)" }}>
                    Click to upload — AI will scan it instantly
                  </span>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </label>

            {/* Cat-Check result banner */}
            {catCheck.state === "checking" && (
              <div className="pm-ai-banner" style={{ marginTop: "0.6rem" }}>
                <span className="pm-paw-spin">🐾</span>
                <div>
                  <strong style={{ fontSize: "0.9rem" }}>Scanning for Cat-ness…</strong>
                  <p style={{ margin: "0.1rem 0 0", fontSize: "0.82rem", color: "var(--color-muted)" }}>
                    Gemini is analysing your image. This takes 2–5 seconds.
                  </p>
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
                  <strong style={{ color: "#065f46", fontSize: "0.88rem" }}>
                    ✅ Cat-ness Confirmed!
                  </strong>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#047857" }}>
                    {catCheck.reason}
                  </p>
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
                  <strong style={{ color: "#b91c1c", fontSize: "0.88rem" }}>
                    🚫 Cat-Check Failed
                  </strong>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#7f1d1d" }}>
                    {catCheck.reason}
                  </p>
                  <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "#991b1b" }}>
                    Use a clear photo of cat-related merchandise (food, toys, tree, litter, etc.).
                  </p>
                </div>
              </div>
            )}

            {catCheck.state === "unavailable" && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "var(--color-muted)" }}>
                {catCheck.message}
              </p>
            )}
          </div>

          {/* ── Title ──────────────────────────────────────────────────── */}
          <label>
            <span className="ph-label">Title *</span>
            <input
              className="ph-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Premium Cat Scratcher"
              required
            />
          </label>

          {/* ── Category ───────────────────────────────────────────────── */}
          <label>
            <span className="ph-label">Category</span>
            <select className="ph-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select a category…</option>
              {PAW_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          {/* ── Description ────────────────────────────────────────────── */}
          <label>
            <span className="ph-label">Description</span>
            <textarea
              className="ph-textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item — material, size, condition, why your cat loves it…"
            />
          </label>

          {/* ── Price / Free toggle ────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            <label className="pm-toggle">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
              />
              <Gift size={15} />
              Give it away for free (Cat-Blessing 🐾)
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
                  placeholder="0.00"
                />
              </label>
            )}
            <label>
              <span className="ph-label">Quantity in stock *</span>
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
                How many identical units you are selling (each order can buy up to this many until sold out).
              </span>
            </label>
          </div>

          {/* ── Location: catalog or map ─────────────────────────────── */}
          <div>
            <span className="ph-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              📍 Item location
            </span>
            <p style={{ margin: "0 0 0.6rem", fontSize: "0.82rem", color: "var(--color-muted)", lineHeight: 1.4 }}>
              Pick your country and city from the list, or drop a pin on the map — we save city, region (when available),
              and country from the map automatically.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem" }}>
              <label className="pm-toggle" style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name="listingLocMode"
                  checked={locationMode === "dropdown"}
                  onChange={() => setLocationMode("dropdown")}
                />
                Country and city list
              </label>
              <label className="pm-toggle" style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name="listingLocMode"
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
                <LocationPickerMap
                  hintCenter={geoHint}
                  initial={pin ?? undefined}
                  onLocationChange={handleLocationChange}
                />
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

          {/* ── Error ──────────────────────────────────────────────────── */}
          {err && (
            <div style={{ color: "#b42318", fontSize: "0.9rem", padding: "0.5rem 0.75rem", background: "#fff1f0", borderRadius: 8 }}>
              {err}
            </div>
          )}

          {alignPhase === "matching" && (
            <div className="pm-ai-banner" style={{ marginTop: "0.2rem" }}>
              <span className="pm-paw-spin">🐾</span>
              <div>
                <strong style={{ fontSize: "0.9rem" }}>Verifying title, description & image…</strong>
                <p style={{ margin: "0.1rem 0 0", fontSize: "0.82rem", color: "var(--color-muted)" }}>
                  Step 2 — this can take a few seconds.
                </p>
              </div>
            </div>
          )}

          {alignPhase === "failed" && alignReason && (
            <div
              style={{
                background: "#fff1f0",
                border: "1.5px solid #fca5a5",
                borderRadius: 10,
                padding: "0.75rem 1rem",
                fontSize: "0.85rem",
                color: "#7f1d1d",
              }}
            >
              <strong>Step 2 failed:</strong> {alignReason}
            </div>
          )}

          {/* ── Submit ─────────────────────────────────────────────────── */}
          <button
            className="ph-btn ph-btn-primary"
            type="submit"
            disabled={!canSubmit}
            style={{
              fontSize: "1rem",
              padding: "0.75rem",
              opacity: canSubmit ? 1 : 0.6,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {catCheck.state === "checking" ? (
              <><span className="pm-paw-spin" style={{ fontSize: "1rem" }}>🐾</span> Scanning image…</>
            ) : alignPhase === "matching" ? (
              <><span className="pm-paw-spin" style={{ fontSize: "1rem" }}>🐾</span> Verifying match…</>
            ) : catCheck.state === "failed" ? (
              "🚫 Fix the image first"
            ) : submitting ? (
              "Working…"
            ) : (
              "🐾 Publish Listing"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
