import "leaflet/dist/leaflet.css";
import L from "leaflet";
<<<<<<< HEAD
import { useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { ReverseGeocodedPlace } from "./reverseGeocodeNominatim";
import { reverseGeocodeNominatim } from "./reverseGeocodeNominatim";
=======
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
>>>>>>> origin/Branch3rd

// Fix default marker icons broken by webpack/vite bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type LatLng = { lat: number; lng: number };

<<<<<<< HEAD
/** Default view when no pin yet: Ras Beirut (Raouche), Beirut, Lebanon */
const DEFAULT_CENTER: [number, number] = [33.9014, 35.4818];

interface LocationPickerMapProps {
  initial?: LatLng;
  /** Fires after each map click; `place` is null if geocoding failed. */
  onLocationChange: (pos: LatLng, place: ReverseGeocodedPlace | null) => void;
=======
/** Beirut — used only when there is no saved pin and browser location is unavailable */
const DEFAULT_CENTER: [number, number] = [33.8938, 35.5018];

interface LocationPickerMapProps {
  initial?: LatLng;
  /** Browser GPS (or similar). Map flies here for new listings so the view matches the seller. */
  hintCenter?: LatLng | null;
  onLocationChange: (pos: LatLng, cityText: string) => void;
>>>>>>> origin/Branch3rd
}

function ClickHandler({ onPick }: { onPick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

<<<<<<< HEAD
export function LocationPickerMap({ initial, onLocationChange }: LocationPickerMapProps) {
  const [pin, setPin] = useState<LatLng | null>(initial ?? null);
  const center: [number, number] = initial ? [initial.lat, initial.lng] : DEFAULT_CENTER;
=======
/** Nominatim requires an identifying User-Agent; without it, results can be wrong or blocked. */
const NOMINATIM_HEADERS: HeadersInit = {
  "User-Agent": "PawHub/1.0 (https://github.com/pawhub; listing location)",
  "Accept-Language": "en",
};

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        suburb?: string;
        neighbourhood?: string;
        city_district?: string;
        state?: string;
        region?: string;
        county?: string;
        country?: string;
      };
    };
    const a = data.address ?? {};
    const locality =
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.suburb ||
      a.city_district ||
      a.neighbourhood ||
      "";
    const regionPart = a.state || a.region || a.county || "";
    const country = a.country || "";
    const parts = [locality, regionPart, country].filter((p) => p.length > 0);
    return parts.join(", ");
  } catch {
    return "";
  }
}

function FlyToWhenCenterChanges({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function LocationPickerMap({ initial, hintCenter, onLocationChange }: LocationPickerMapProps) {
  const [pin, setPin] = useState<LatLng | null>(initial ?? null);

  const [viewCenter, setViewCenter] = useState<[number, number]>(() => {
    if (initial) return [initial.lat, initial.lng];
    if (hintCenter) return [hintCenter.lat, hintCenter.lng];
    return DEFAULT_CENTER;
  });

  useEffect(() => {
    if (initial) {
      setPin(initial);
      setViewCenter([initial.lat, initial.lng]);
    }
  }, [initial?.lat, initial?.lng]);

  useEffect(() => {
    if (initial) return;
    if (pin) return;
    if (!hintCenter) return;
    setViewCenter([hintCenter.lat, hintCenter.lng]);
  }, [initial, pin, hintCenter]);
>>>>>>> origin/Branch3rd

  async function handlePick(pos: LatLng) {
    setPin(pos);
    const place = await reverseGeocodeNominatim(pos.lat, pos.lng);
    onLocationChange(pos, place);
  }

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border)" }}>
      <MapContainer
        center={viewCenter}
        zoom={12}
        style={{ height: 280, width: "100%" }}
        scrollWheelZoom={false}
      >
        <FlyToWhenCenterChanges center={viewCenter} zoom={12} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={(p) => void handlePick(p)} />
        {pin && <Marker position={[pin.lat, pin.lng]} />}
      </MapContainer>
      <p
        style={{
          margin: 0,
          padding: "0.5rem 0.75rem",
          fontSize: "0.8rem",
          color: "var(--color-muted)",
          background: "#fafaf8",
        }}
      >
        {pin
          ? `Pin at ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} — click to move`
          : "Click on the map to drop a pin (map centers on your location when available)"}
      </p>
    </div>
  );
}
