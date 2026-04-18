import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthShell } from "../auth/AuthShell";

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
      nav("/");
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your PawHub journey.">
      <form onSubmit={onSubmit} className="ph-grid" style={{ gap: "1rem" }}>
        <div>
          <span className="ph-label">Email</span>
          <input
            className="ph-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <span className="ph-label">Password</span>
          <input
            className="ph-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {err && (
          <div
            style={{
              color: "#b42318",
              fontSize: "0.9rem",
              padding: "0.5rem 0.65rem",
              background: "#fef2f2",
              borderRadius: "10px",
            }}
          >
            {err}
          </div>
        )}
        <button className="ph-btn ph-btn-primary" type="submit" style={{ width: "100%", padding: "0.65rem" }}>
          Sign in
        </button>
      </form>
      <p style={{ marginTop: "1.25rem", textAlign: "center", color: "var(--color-muted)", fontSize: "0.95rem" }}>
        New to PawHub?{" "}
        <Link to="/register" style={{ fontWeight: 600, color: "var(--color-primary-dark)" }}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
