import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="ph-auth-root">
      <div className="ph-auth-hero">
        <Link to="/" className="ph-auth-brand">
          PawHub
        </Link>
        <p className="ph-auth-tagline">One cozy place for whiskers, matches, and forever homes.</p>
        <ul className="ph-auth-bullets">
          <li>PawMatch & community</li>
          <li>PawMarket listings</li>
          <li>PawAdopt & shelters</li>
        </ul>
      </div>
      <div className="ph-auth-panel">
        <div className="ph-auth-card ph-surface">
          <h1 className="ph-auth-title">{title}</h1>
          {subtitle && <p className="ph-auth-subtitle">{subtitle}</p>}
          {children}
        </div>
        <p className="ph-auth-foot">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
