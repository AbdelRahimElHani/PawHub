import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { ReverseGeocodedPlace } from "./reverseGeocodeNominatim";
import { reverseGeocodeNominatim } from "./reverseGeocodeNominatim";

// Fix default marker icons broken by webpack/vite bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type LatLng = { lat: number; lng: number };

/** Default view when no pin yet: Ras Beirut (Raouche), Beirut, Lebanon */
const DEFAULT_CENTER: [number, number] = [33.9014, 35.4818];

interface LocationPickerMapProps {
  initial?: LatLng;
  /** Fires after each map click; `place` is null if geocoding failed. */
  onLocationChange: (pos: LatLng, place: ReverseGeocodedPlace | null) => void;
}

function ClickHandler({ onPick }: { onPick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function LocationPickerMap({ initial, onLocationChange }: LocationPickerMapProps) {
  const [pin, setPin] = useState<LatLng | null>(initial ?? null);
  const center: [number, number] = initial ? [initial.lat, initial.lng] : DEFAULT_CENTER;

  async function handlePick(pos: LatLng) {
    setPin(pos);
    const place = await reverseGeocodeNominatim(pos.lat, pos.lng);
    onLocationChange(pos, place);
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
