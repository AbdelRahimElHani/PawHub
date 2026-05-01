import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, MessageCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { isAdminAccount } from "../auth/vetAccess";
import type { AdoptionListingDto, ShelterDto } from "../types";
import { useAdoptStore } from "./useAdoptStore";
import { vibeLabelForListing } from "./adoptPersonality";
import { AdoptPlaceholderCat } from "./AdoptPlaceholderCat";
import "./adopt.css";

function ageLabel(months: number | null): string {
  if (months == null) return "—";
  if (months < 12) return `${months} mo`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} yr ${m} mo` : `${y} yr`;
}

export function AdoptDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [listing, setListing] = useState<AdoptionListingDto | null>(null);
  const [shelterMine, setShelterMine] = useState<ShelterDto | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [inquireErr, setInquireErr] = useState<string | null>(null);
  const [manageErr, setManageErr] = useState<string | null>(null);
  const [manageBusy, setManageBusy] = useState(false);
  const toggleFavorite = useAdoptStore((s) => s.toggleFavorite);
  const isFavorite = useAdoptStore((s) => (id ? s.isFavorite(Number(id)) : false));

  const layoutId = id ? `adopt-cat-photo-${id}` : "adopt-cat-photo";

  useEffect(() => {
    if (!id) return;
    setErr(null);
    void api<AdoptionListingDto>(`/api/adopt/listings/${id}`)
      .then(setListing)
      .catch(() => setErr("This profile isn’t available."));
  }, [id]);

  useEffect(() => {
    if (!user || user.accountType !== "SHELTER") {
      setShelterMine(null);
      return;
    }
    let cancelled = false;
    void api<ShelterDto | null>("/api/adopt/shelters/mine")
      .then((s) => {
        if (!cancelled) setShelterMine(s ?? null);
      })
      .catch(() => {
        if (!cancelled) setShelterMine(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isOwnShelterListing = Boolean(
    user?.accountType === "SHELTER" && shelterMine && listing && listing.shelterId === shelterMine.id,
  );
  const isAdminUser = isAdminAccount(user);

  useEffect(() => {
    if (!listing || !id) return;
    if (searchParams.get("contact") !== "1") return;
    if (user?.accountType === "SHELTER" && shelterMine === undefined) return;
    if (isOwnShelterListing) {
      setSearchParams({}, { replace: true });
      return;
    }
    if (isAdminUser) {
      setSearchParams({}, { replace: true });
      return;
    }
    if (!user) {
      nav(`/login?next=${encodeURIComponent(`/adopt/${id}?contact=1`)}`);
      return;
    }
    setModalOpen(true);
    setInquireErr(null);
    setSearchParams({}, { replace: true });
  }, [listing, id, user, nav, setSearchParams, searchParams.get("contact"), shelterMine, isOwnShelterListing, isAdminUser]);

  function openInquiryFlow() {
    if (isOwnShelterListing || isAdminUser) return;
    setInquireErr(null);
    if (!user) {
      nav(`/login?next=${encodeURIComponent(`/adopt/${id}?contact=1`)}`);
      return;
    }
    setModalOpen(true);
  }

  async function markAdopted() {
    if (!id) return;
    setManageErr(null);
    setManageBusy(true);
    try {
      const updated = await api<AdoptionListingDto>(`/api/adopt/listings/${id}/mark-adopted`, { method: "POST" });
      setListing(updated);
    } catch (e: unknown) {
      setManageErr(e instanceof Error ? e.message : "Could not update listing.");
    } finally {
      setManageBusy(false);
    }
  }

  async function deleteAdoptedListing() {
    if (!id || !listing) return;
    const listingId = listing.id;
    if (!window.confirm("Remove this adopted listing from PawHub? This cannot be undone.")) return;
    setManageErr(null);
    setManageBusy(true);
    try {
      await api(`/api/adopt/listings/${id}`, { method: "DELETE" });
      if (isFavorite) toggleFavorite(listingId);
      nav("/adopt", { replace: true });
    } catch (e: unknown) {
      setManageErr(e instanceof Error ? e.message : "Could not delete listing.");
    } finally {
      setManageBusy(false);
    }
  }

  async function inquire() {
    if (!id) return;
    setInquireErr(null);
    try {
      const r = await api<{ threadId: number }>(`/api/adopt/listings/${id}/inquire`, { method: "POST" });
      setModalOpen(false);
      nav(`/messages/${r.threadId}`);
    } catch (e: unknown) {
      setInquireErr(e instanceof Error ? e.message : "Could not start inquiry.");
    }
  }

  if (!listing && !err) {
    return (
      <div className="adopt-detail" style={{ padding: "2rem", color: "var(--color-muted)" }}>
        Loading…
      </div>
    );
  }

  if (err || !listing) {
    return (
      <div className="adopt-detail" style={{ padding: "2rem" }}>
        <p>{err ?? "Not found."}</p>
        <Link to="/adopt" className="ph-btn ph-btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
          Back to gallery
        </Link>
      </div>
    );
  }

  const story =
    listing.description?.trim() ||
    `${listing.petName ?? listing.title} is waiting to meet you. Ask the shelter about personality, medical history, and what a great home looks like for this cat.`;

  return (
    <div className="adopt-detail">
      <div className="adopt-detail__grid">
        <div className="adopt-detail__media">
          <motion.div
            layoutId={layoutId}
            layout
            style={{ width: "100%", height: "100%", position: "relative" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            {listing.photoUrl ? (
              <img src={listing.photoUrl} alt={listing.petName ?? listing.title} style={{ display: "block" }} />
            ) : (
              <div className="adopt-card__placeholder" style={{ minHeight: "40vh" }}>
                <AdoptPlaceholderCat />
              </div>
            )}
          </motion.div>
          <Link
            to="/adopt"
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              zIndex: 2,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.45rem 0.85rem",
              borderRadius: 999,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.88rem",
              color: "var(--color-primary-dark)",
              background: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
              backdropFilter: "blur(15px)",
            }}
          >
            <ArrowLeft size={18} aria-hidden /> Gallery
          </Link>
        </div>

        <div className="adopt-detail__body">
          <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-muted)", margin: "0 0 0.35rem" }}>
            {vibeLabelForListing(listing)}
          </p>
          <h1 className="adopt-detail__title">{listing.petName ?? listing.title}</h1>
          <p className="adopt-detail__subtitle">
            {listing.breed ?? "Mixed breed"} · {ageLabel(listing.ageMonths)} · {listing.shelterName}
          </p>

          <div className="adopt-verified-pill" title="This listing is published by a shelter verified by PawHub">
            <BadgeCheck size={18} strokeWidth={2} aria-hidden />
            <span>Verified shelter partner</span>
          </div>

          <h2 className="adopt-detail__section-title">The story</h2>
          <div className="adopt-detail__story">{story}</div>

          {manageErr ? (
            <p role="alert" style={{ color: "#b42318", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
              {manageErr}
            </p>
          ) : null}

          {isOwnShelterListing ? (
            <div className="adopt-detail__actions" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.65rem" }}>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
                This cat is listed under <strong>{listing.shelterName}</strong> (your shelter). Messaging is for adopters
                contacting you—you can’t start a shelter inquiry with your own listing.
              </p>
              {listing.status === "ACTIVE" ? (
                <motion.button
                  type="button"
                  className="ph-btn ph-btn-primary adopt-detail__cta-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={manageBusy}
                  onClick={() => void markAdopted()}
                >
                  Mark as adopted (remove from public gallery)
                </motion.button>
              ) : listing.status === "SOLD" ? (
                <>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
                    This cat is marked adopted. Delete the record when you no longer need it in PawHub.
                  </p>
                  <motion.button
                    type="button"
                    className="ph-btn ph-btn-ghost adopt-detail__cta-primary"
                    style={{ color: "#b42318", borderColor: "color-mix(in srgb, #b42318 35%, transparent)" }}
                    whileTap={{ scale: 0.98 }}
                    disabled={manageBusy}
                    onClick={() => void deleteAdoptedListing()}
                  >
                    <Trash2 size={18} strokeWidth={2} aria-hidden />
                    Delete listing
                  </motion.button>
                </>
              ) : null}
              <Link to="/adopt/my-listings" className="ph-btn ph-btn-ghost" style={{ justifyContent: "center" }}>
                My listings & archive
              </Link>
              <Link to="/adopt/new" className="ph-btn ph-btn-ghost" style={{ justifyContent: "center" }}>
                Add another listing
              </Link>
            </div>
          ) : isAdminUser ? (
            <div className="adopt-detail__actions" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.65rem" }}>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-muted)", lineHeight: 1.55 }}>
                Admin accounts use the shelter queue to review or remove listings. Messaging and Love List are disabled
                here so verification stays separate from adopter tools.
              </p>
              <Link to="/adopt/admin/shelters" className="ph-btn ph-btn-ghost" style={{ justifyContent: "center" }}>
                Shelter admin queue
              </Link>
            </div>
          ) : (
            <div className="adopt-detail__actions">
              <motion.button
                type="button"
                className="ph-btn ph-btn-primary adopt-detail__cta-primary"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openInquiryFlow()}
              >
                <MessageCircle size={18} strokeWidth={2} aria-hidden />
                Message shelter
              </motion.button>
              <motion.button
                type="button"
                className="ph-btn ph-btn-ghost adopt-detail__cta-secondary"
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleFavorite(listing.id)}
              >
                {isFavorite ? "♥ On your Love List" : "♡ Save to Love List"}
              </motion.button>
            </div>
          )}

          <footer className="adopt-shelter-footer">
            <h3>About this shelter</h3>
            {isOwnShelterListing ? (
              <p>
                <strong>{listing.shelterName}</strong> is your organization’s verified partner profile. Use{" "}
                <strong>Messages</strong> when adopters reach out from their accounts.
              </p>
            ) : isAdminUser ? (
              <p>
                <strong>{listing.shelterName}</strong> is the listing shelter. Use the admin shelter tools to verify
                partners or remove listings when needed.
              </p>
            ) : (
              <p>
                <strong>{listing.shelterName}</strong> is a verified partner. After you tap Message shelter, you and the
                team can chat in PawHub messages—just like Paw Market—so you can plan a meet-and-greet safely.
              </p>
            )}
          </footer>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="adopt-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
            role="presentation"
          >
            <motion.div
              className="adopt-modal"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="adopt-inquiry-title"
            >
              <h2 id="adopt-inquiry-title">Message the shelter</h2>
              <p>
                We’ll open a private thread with <strong>{listing.shelterName}</strong>. PawHub will send an opening note
                that you’re asking about this cat with a link to the listing—then you can chat about personality,
                medical history, and visits, just like Paw Market.
              </p>
              {inquireErr && (
                <p style={{ color: "#b42318", marginTop: "-0.5rem" }} role="alert">
                  {inquireErr}
                </p>
              )}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="ph-btn ph-btn-primary adopt-modal__primary" onClick={() => void inquire()}>
                  <MessageCircle size={16} strokeWidth={2} aria-hidden />
                  Open messages
                </button>
                <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setModalOpen(false)}>
                  Not yet
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
