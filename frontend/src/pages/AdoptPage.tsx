import { AdoptHub } from "../adopt/AdoptHub";

export function AdoptPage() {
  return (
    <div className="ph-surface" style={{ padding: "clamp(1rem, 2vw, 1.75rem)", borderRadius: 20 }}>
      <AdoptHub />
    </div>
  );
}
