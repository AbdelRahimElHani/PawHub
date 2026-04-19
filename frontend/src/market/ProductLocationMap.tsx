import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, TileLayer } from "react-leaflet";

interface ProductLocationMapProps {
  lat: number;
  lng: number;
  radiusMeters?: number;
}

export function ProductLocationMap({
  lat,
  lng,
  radiusMeters = 750,
}: ProductLocationMapProps) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border)" }}>
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        style={{ height: 220, width: "100%" }}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle
          center={[lat, lng]}
          radius={radiusMeters}
          pathOptions={{
            color: "#3d8b7a",
            fillColor: "#3d8b7a",
            fillOpacity: 0.18,
            weight: 2,
          }}
        />
      </MapContainer>
      <p
        style={{
          margin: 0,
          padding: "0.45rem 0.75rem",
          fontSize: "0.78rem",
          color: "var(--color-muted)",
          background: "#fafaf8",
        }}
      >
        🔒 Approximate area shown for privacy
      </p>
    </div>
  );
}
