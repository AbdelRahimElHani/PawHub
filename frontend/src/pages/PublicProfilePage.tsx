import { MessageCircle, UserPlus, UserRound, Check, X, Ban } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { PublicUserProfileDto, ThreadIdResponse } from "../types";

async function openDmThread(userId: number): Promise<ThreadIdResponse> {
  return api<ThreadIdResponse>(`/api/chat/dm/${userId}`, { method: "POST" });
}

export function PublicProfilePage() {
  const { userId: userIdParam } = useParams();
  const navigate = useNavigate();
  const userId = userIdParam ? Number(userIdParam) : NaN;

  const [profile, setProfile] = useState<PublicUserProfileDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(userId)) {
      setErr("Invalid profile.");
      return;
    }
    setErr(null);
    try {
      const p = await api<PublicUserProfileDto>(`/api/users/${userId}/public`);
      setProfile(p);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not load profile.");
      setProfile(null);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    label: string,
    path: string,
    method: "POST" | "DELETE",
    body?: object
  ) {
    setBusy(label);
    setErr(null);
    try {
      await api(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: body ? { "Content-Type": "application/json" } : undefined,
      });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  if (!Number.isFinite(userId)) {
    return <p style={{ padding: "2rem" }}>Invalid user.</p>;
  }

  if (err && !profile) {
    return (
      <div style={{ padding: "2rem", maxWidth: 520 }}>
        <p style={{ color: "#b42318" }}>{err}</p>
        <Link to="/people">Back to People</Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <span className="pm-paw-spin">🐾</span>
        <p>Loading…</p>
      </div>
    );
  }

  const rel = profile.relationship;
  const isSelf = rel === "SELF";

  const TYPE_LABEL: Record<string, string> = {
    ADOPTER: "Adopter / explorer",
    CAT_OWNER: "Cat owner",
    SHELTER: "Shelter / rescue",
    VET: "Veterinarian (PawVet)",
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "1.25rem 1rem 2.5rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/people" style={{ fontSize: "0.88rem", color: "var(--color-muted)" }}>
          ← People directory
        </Link>
      </div>

      <div className="ph-surface" style={{ padding: "1.25rem 1.35rem", borderRadius: 16 }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              width={88}
              height={88}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              className="ph-account-avatar-lg ph-account-avatar-lg--placeholder"
              style={{ width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <UserRound size={40} strokeWidth={1.75} aria-hidden />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="ph-account-title" style={{ margin: "0 0 0.25rem", fontSize: "1.35rem" }}>
              {profile.displayName}
            </h1>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-muted)" }}>
              {profile.accountType ? TYPE_LABEL[profile.accountType] ?? profile.accountType : "Member"}
            </p>
          </div>
        </div>

        {(profile.profileCity || profile.profileRegion) && (
          <p style={{ margin: "1rem 0 0", fontSize: "0.9rem", color: "var(--color-text)" }}>
            {[profile.profileCity, profile.profileRegion].filter(Boolean).join(" · ")}
          </p>
        )}

        {profile.profileBio && (
          <p style={{ margin: "0.85rem 0 0", lineHeight: 1.55, fontSize: "0.92rem", whiteSpace: "pre-wrap" }}>
            {profile.profileBio}
          </p>
        )}

        {err && (
          <p style={{ margin: "1rem 0 0", color: "#b42318", fontSize: "0.88rem" }}>{err}</p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1.25rem" }}>
          {isSelf ? (
            <Link className="ph-btn ph-btn-primary" to="/account">
              Edit my profile
            </Link>
          ) : (
            <>
              <button
                type="button"
                className="ph-btn ph-btn-primary"
                disabled={!!busy}
                onClick={() =>
                  void (async () => {
                    setBusy("msg");
                    setErr(null);
                    try {
                      const r = await openDmThread(userId);
                      navigate(`/messages/${r.threadId}`);
                    } catch (e: unknown) {
                      setErr(e instanceof Error ? e.message : "Could not open chat.");
                    } finally {
                      setBusy(null);
                    }
                  })()
                }
              >
                <MessageCircle size={16} aria-hidden /> Message
              </button>
              {rel === "FRIENDS" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: "var(--color-primary-dark)",
                  }}
                >
                  <Check size={16} aria-hidden /> Friends
                </span>
              )}
              {rel === "NONE" && (
                <button
                  type="button"
                  className="ph-btn ph-btn-ghost"
                  disabled={!!busy}
                  onClick={() => void act("req", "/api/social/friends/request", "POST", { otherUserId: userId })}
                >
                  <UserPlus size={16} aria-hidden /> Add friend
                </button>
              )}
              {rel === "OUTGOING_PENDING" && (
                <button
                  type="button"
                  className="ph-btn ph-btn-ghost"
                  disabled={!!busy}
                  onClick={() =>
                    void act("cancel", `/api/social/friends/pending/${userId}`, "DELETE")
                  }
                >
                  <Ban size={16} aria-hidden /> Cancel request
                </button>
              )}
              {rel === "INCOMING_PENDING" && (
                <>
                  <button
                    type="button"
                    className="ph-btn ph-btn-primary"
                    disabled={!!busy}
                    onClick={() =>
                      void act("acc", "/api/social/friends/accept", "POST", { otherUserId: userId })
                    }
                  >
                    <Check size={16} aria-hidden /> Accept
                  </button>
                  <button
                    type="button"
                    className="ph-btn ph-btn-ghost"
                    disabled={!!busy}
                    onClick={() =>
                      void act("dec", "/api/social/friends/decline", "POST", { otherUserId: userId })
                    }
                  >
                    <X size={16} aria-hidden /> Decline
                  </button>
                </>
              )}
              {rel !== "FRIENDS" && (
                <p
                  style={{
                    width: "100%",
                    margin: "0.35rem 0 0",
                    fontSize: "0.85rem",
                    color: "var(--color-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Message</strong> opens a request: you can send <strong>one intro</strong> until they reply
                  or accept; then it&apos;s normal chat. If they decline, this thread stays closed until you&apos;re
                  friends. Paw Market and PawMatch still open their own threads.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
