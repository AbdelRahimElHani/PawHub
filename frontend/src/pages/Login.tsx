import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthShell } from "../auth/AuthShell";

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  const pendingVerification = searchParams.get("pendingVerification") === "1";
  const emailFromQuery = searchParams.get("email");
  const rawNext = searchParams.get("next") ?? searchParams.get("returnUrl");
  const safeNext =
    rawNext && rawNext.length > 0
      ? (() => {
          try {
            const d = decodeURIComponent(rawNext);
            if (d.startsWith("/") && !d.startsWith("//") && !d.includes("://")) {
              return d;
            }
          } catch {
            /* ignore malformed */
          }
          return null;
        })()
      : null;

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      setResendEmail(emailFromQuery);
    }
  }, [emailFromQuery]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
      nav(safeNext ?? "/");
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    }
  }

  async function onResend(e: FormEvent) {
    e.preventDefault();
    setResendMsg(null);
    const em = resendEmail.trim();
    if (!em) {
      setResendMsg("Enter your email.");
      return;
    }
    setResendBusy(true);
    try {
      const res = await fetch(apiUrl("/api/auth/resend-verification"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em }),
      });
      const j = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(j.error ?? res.statusText);
      }
      setResendMsg(j.message ?? "If that account exists and is unverified, we sent a new link.");
    } catch (ex: unknown) {
      setResendMsg(ex instanceof Error ? ex.message : "Could not send");
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your PawHub journey.">
      {pendingVerification && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.85rem 1rem",
            background: "#f0f9ff",
            border: "1px solid #7dd3fc",
            borderRadius: "12px",
            fontSize: "0.9rem",
            color: "var(--color-text)",
          }}
        >
          <strong>Almost there.</strong> We sent a verification link to your email. Open it to activate your account, then sign in
          below.
        </div>
      )}

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

      <div
        style={{
          marginTop: "1.5rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <span className="ph-label">Didn’t get the email?</span>
        <form onSubmit={onResend} className="ph-grid" style={{ gap: "0.5rem", marginTop: "0.35rem" }}>
          <input
            className="ph-input"
            type="email"
            placeholder="Your email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            autoComplete="email"
          />
          <button className="ph-btn" type="submit" disabled={resendBusy}>
            {resendBusy ? "Sending…" : "Resend verification link"}
          </button>
        </form>
        {resendMsg && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.88rem", color: "var(--color-muted)" }}>{resendMsg}</p>
        )}
      </div>

      <p style={{ marginTop: "1.25rem", textAlign: "center", color: "var(--color-muted)", fontSize: "0.95rem" }}>
        New to PawHub?{" "}
        <Link to="/register" style={{ fontWeight: 600, color: "var(--color-primary-dark)" }}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
