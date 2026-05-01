import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { AdoptionListingDto, ShelterDto } from "../types";
import "../adopt/adopt.css";

export function AdoptMyListingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [shelter, setShelter] = useState<ShelterDto | null | undefined>(undefined);
  const [active, setActive] = useState<AdoptionListingDto[]>([]);
  const [archive, setArchive] = useState<AdoptionListingDto[]>([]);
  const [tab, setTab] = useState<"active" | "archive">("active");
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const canView = user?.accountType === "SHELTER" && shelter?.status === "APPROVED";

  useEffect(() => {
    if (!user) {
      setShelter(null);
      return;
    }
    void api<ShelterDto | null>("/api/adopt/shelters/mine")
      .then((s) => setShelter(s))
      .catch(() => setShelter(null));
  }, [user]);

  const load = useCallback(async () => {
    if (!canView) return;
    setErr(null);
    try {
      const [a, z] = await Promise.all([
        api<AdoptionListingDto[]>("/api/adopt/listings/mine"),
        api<AdoptionListingDto[]>("/api/adopt/listings/mine/archive"),
      ]);
      setActive(a);
      setArchive(z);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not load listings.");
    }
  }, [canView]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAdoptedRow(listingId: number) {
    setErr(null);
    setBusyId(listingId);
    try {
      await api<AdoptionListingDto>(`/api/adopt/listings/${listingId}/mark-adopted`, { method: "POST" });
      await load();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAdoptedRow(listingId: number) {
    if (!window.confirm("Remove this adopted listing permanently?")) return;
    setErr(null);
    setBusyId(listingId);
    try {
      await api(`/api/adopt/listings/${listingId}`, { method: "DELETE" });
      await load();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || (user && shelter === undefined)) {
    return (
      <div className="adopt-form-shell">
        <p style={{ color: "var(--color-muted)" }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="adopt-form-shell">
        <div className="adopt-gate">
          <h2>Sign in</h2>
          <p>Sign in with your verified shelter account to manage listings.</p>
          <Link className="ph-btn ph-btn-primary" to={`/login?next=${encodeURIComponent("/adopt/my-listings")}`}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (user.accountType !== "SHELTER" || !shelter) {
    return (
      <div className="adopt-form-shell">
        <div className="adopt-gate">
          <h2>Shelter accounts only</h2>
          <p>This page is for verified shelter partners.</p>
          <Link className="ph-btn ph-btn-primary" to="/adopt/shelter">
            Shelter & verification
          </Link>
        </div>
      </div>
    );
  }

  if (shelter.status !== "APPROVED") {
    return (
      <div className="adopt-form-shell">
        <div className="adopt-gate">
          <BadgeCheck size={28} strokeWidth={2} aria-hidden style={{ color: "#d4a012", marginBottom: "0.5rem" }} />
          <h2>Verification required</h2>
          <p>Once your shelter is approved, you can manage live listings and adopted cats here.</p>
          <Link className="ph-btn ph-btn-primary" to="/adopt/shelter">
            Shelter status
          </Link>
        </div>
      </div>
    );
  }

  const rows = tab === "active" ? active : archive;

  return (
    <div className="ph-surface adopt-form-shell" style={{ borderRadius: 24 }}>
      <p style={{ marginBottom: "0.75rem" }}>
        <Link to="/adopt" style={{ fontWeight: 600 }}>
          ← Paw Adopt
        </Link>
        {" · "}
        <Link to="/adopt/new" style={{ fontWeight: 600 }}>
          New listing
        </Link>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>My listings & archive</h1>
      <p style={{ color: "var(--color-muted)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
        <strong>Active</strong> cats appear in the public gallery. After you mark a cat adopted, they move to your{" "}
        <strong>archive</strong> until you delete the record.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button
          type="button"
          className="ph-btn ph-btn-ghost"
          data-active={tab === "active"}
          style={{ fontWeight: tab === "active" ? 700 : 500 }}
          onClick={() => setTab("active")}
        >
          Active ({active.length})
        </button>
        <button
          type="button"
          className="ph-btn ph-btn-ghost"
          data-active={tab === "archive"}
          style={{ fontWeight: tab === "archive" ? 700 : 500 }}
          onClick={() => setTab("archive")}
        >
          Adopted archive ({archive.length})
        </button>
      </div>

      {err ? (
        <p role="alert" style={{ color: "#b42318", fontSize: "0.9rem" }}>
          {err}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p style={{ color: "var(--color-muted)" }}>
          {tab === "active" ? "No active listings right now." : "No adopted listings in your archive."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {rows.map((row) => (
            <li
              key={row.id}
              className="ph-surface"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: 12,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.65rem",
                justifyContent: "space-between",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                <strong style={{ color: "var(--color-primary-dark)" }}>{row.petName ?? row.title}</strong>
                <span style={{ color: "var(--color-muted)", fontSize: "0.82rem", marginLeft: "0.5rem" }}>
                  {row.status === "SOLD" ? "Adopted" : "Live"}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                <Link className="ph-btn ph-btn-ghost" style={{ fontSize: "0.82rem" }} to={`/adopt/${row.id}`}>
                  Open
                </Link>
                {tab === "active" ? (
                  <button
                    type="button"
                    className="ph-btn ph-btn-primary"
                    style={{ fontSize: "0.82rem" }}
                    disabled={busyId === row.id}
                    onClick={() => void markAdoptedRow(row.id)}
                  >
                    Mark adopted
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ph-btn ph-btn-ghost"
                    style={{ fontSize: "0.82rem", color: "#b42318" }}
                    disabled={busyId === row.id}
                    onClick={() => void deleteAdoptedRow(row.id)}
                  >
                    <Trash2 size={14} aria-hidden style={{ marginRight: 4, verticalAlign: "middle" }} />
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
