import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthShell } from "../auth/AuthShell";
import { apiUrl } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type VerifyState = "loading" | "ok" | "err";

function buildLoginHref(email: string | null | undefined, nextPath?: string) {
  const p = new URLSearchParams();
  if (email && email.length > 0) {
    p.set("email", email);
  }
  if (nextPath && nextPath.length > 0) {
    p.set("next", nextPath);
  }
  const s = p.toString();
  return s ? `/login?${s}` : "/login";
}

export function VerifyEmailPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = (searchParams.get("email") ?? "").trim();
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = token?.trim() ?? "";
    if (!t) {
      setState("err");
      setMessage("This link is missing a verification token. Open the full link from your email.");
      return;
    }

    let cancelled = false;

    async function run() {
      const q = new URLSearchParams({ token: t });
      if (emailParam) {
        q.set("email", emailParam);
      }
      const verifyUrl = apiUrl(`/api/auth/verify-email?${q.toString()}`);

      try {
        const res = await fetch(verifyUrl);
        const j = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
          verified?: boolean;
        };
        if (cancelled) {
          return;
        }

        if (res.ok) {
          setMessage(j.message ?? "Your email is verified. You can sign in now.");
          setState("ok");
          return;
        }

        const errText = j.error ?? res.statusText;
        if (emailParam) {
          const check = await fetch(
            apiUrl(`/api/auth/email-verified?email=${encodeURIComponent(emailParam)}`)
          );
          const cj = (await check.json().catch(() => ({}))) as { verified?: boolean };
          if (!cancelled && check.ok && cj.verified) {
            setMessage(
              "Your email is already verified—sometimes the first tap finishes before the page updates. You are all set."
            );
            setState("ok");
            return;
          }
        }

        setMessage(errText);
        setState("err");
      } catch (e: unknown) {
        if (!cancelled) {
          setMessage(e instanceof Error ? e.message : "Verification failed");
          setState("err");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, emailParam]);

  const signInToCatsHref = buildLoginHref(emailParam, "/cats");

  const shellTitle =
    state === "ok"
      ? "Welcome to the Litter!"
      : state === "err"
        ? "Verification link issue"
        : "Email verification";
  const shellSubtitle =
    state === "ok"
      ? "Your human account is ready—open My Cats or sign in to continue."
      : state === "err"
        ? "We could not use this link. Try a fresh one from your inbox, or sign in if you are already verified."
        : "We are confirming your PawHub account. Sit tight—this only takes a moment.";

  return (
    <AuthShell title={shellTitle} subtitle={shellSubtitle}>
      <div className="ph-verify-content">
        {emailParam ? (
          <div className="ph-verify-field-wrap" style={{ marginBottom: "1rem", textAlign: "left" }}>
            <label className="ph-label" htmlFor="verify-email-readonly">
              Account email
            </label>
            <input
              id="verify-email-readonly"
              className="ph-input"
              type="email"
              readOnly
              autoComplete="email"
              value={emailParam}
              tabIndex={-1}
            />
          </div>
        ) : null}

        {state === "loading" && (
          <div className="ph-verify-card ph-verify-card--loading">
            <div className="ph-verify-spinner" aria-hidden />
            <p className="ph-verify-status">Verifying your link…</p>
            <p className="ph-verify-hint" style={{ margin: 0 }}>
              If you just confirmed on another device, we will still catch up.
            </p>
          </div>
        )}

        {state === "ok" && (
          <div className="ph-verify-card ph-verify-card--success" role="status">
            <div className="ph-verify-icon ph-verify-icon--paw" aria-hidden>
              🐱
            </div>
            {message ? <p className="ph-verify-message">{message}</p> : null}
            {emailParam ? (
              <p className="ph-verify-hint ph-verify-hint--boxed">
                <span className="ph-verify-label">You are in as</span> {emailParam}
              </p>
            ) : null}
            <div className="ph-verify-cta-row">
              {user ? (
                <Link to="/cats" className="ph-btn ph-btn-primary ph-verify-cta-link">
                  Open My Cats
                </Link>
              ) : (
                <Link to={signInToCatsHref} className="ph-btn ph-btn-primary ph-verify-cta-link">
                  Sign in to open My Cats
                </Link>
              )}
            </div>
            {!user && (
              <p className="ph-verify-foot" style={{ marginTop: "0.75rem" }}>
                After you sign in, you will land on <strong>My Cats</strong> automatically.
              </p>
            )}
            {user ? (
              <p className="ph-verify-cta" style={{ marginTop: "0.75rem" }}>
                <Link to="/login" className="ph-btn ph-btn-ghost ph-verify-cta-link">
                  Use a different account
                </Link>
              </p>
            ) : null}
          </div>
        )}

        {state === "err" && (
          <div className="ph-verify-card ph-verify-card--error" role="alert">
            <div className="ph-verify-icon ph-verify-icon--bad" aria-hidden>
              !
            </div>
            <p className="ph-verify-message ph-verify-message--err">{message}</p>
            <p className="ph-verify-foot">
              Need a new link? Use &quot;Resend verification&quot; on the sign-in page.
            </p>
            <div className="ph-verify-cta-row">
              <Link to={buildLoginHref(emailParam)} className="ph-btn ph-btn-primary ph-verify-cta-link">
                Go to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
