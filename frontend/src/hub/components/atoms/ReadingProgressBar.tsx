export function ReadingProgressBar({ progress }: { progress: number }) {
  const pct = Math.round(Math.min(100, Math.max(0, progress * 100)));
  return (
    <div className="hub-read-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="hub-read-progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
