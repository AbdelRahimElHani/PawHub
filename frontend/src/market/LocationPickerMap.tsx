import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

// Fix default marker icons broken by webpack/vite bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type LatLng = { lat: number; lng: number };

interface LocationPickerMapProps {
  initial?: LatLng;
  onLocationChange: (pos: LatLng, cityText: string) => void;
}

function ClickHandler({ onPick }: { onPick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        neighbourhood?: string;
        county?: string;
      };
    };
    const a = data.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.county ?? "";
    const area = a.suburb ?? a.neighbourhood ?? "";
    return [city, area].filter(Boolean).join(", ");
  } catch {
    return "";
  }
}

export function LocationPickerMap({ initial, onLocationChange }: LocationPickerMapProps) {
  const [pin, setPin] = useState<LatLng | null>(initial ?? null);
  const center: [number, number] = initial
    ? [initial.lat, initial.lng]
    : [48.8566, 2.3522]; // default to Paris

  async function handlePick(pos: LatLng) {
    setPin(pos);
    const cityText = await reverseGeocode(pos.lat, pos.lng);
    onLocationChange(pos, cityText);
  }

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border)" }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: 280, width: "100%" }}
        scrollWheelZoom={false}
      >
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
          : "Click on the map to drop a pin"}
      </p>
    </div>
  );
}
