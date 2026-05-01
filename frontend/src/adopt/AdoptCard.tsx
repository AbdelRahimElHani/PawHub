import { motion } from "framer-motion";
import { BadgeCheck, Heart, Trash2 } from "lucide-react";
import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { Link } from "react-router-dom";
import { AdminAdoptRemoveDialog } from "./AdminAdoptRemoveDialog";
import { userInitials } from "../shell/userDisplay";
import type { AdoptionListingDto } from "../types";
import { vibeLabelForListing } from "./adoptPersonality";
import { AdoptPlaceholderCat } from "./AdoptPlaceholderCat";
import { useMediaLightbox } from "../components/media/MediaLightboxContext";
import { useAdoptStore } from "./useAdoptStore";

type Props = {
  listing: AdoptionListingDto;
  hideLove?: boolean;
  /** Platform admin: remove listing from gallery without opening detail. */
  adminDelete?: boolean;
  onAdminRemoved?: (listingId: number) => void;
};

export function AdoptCard({ listing, hideLove, adminDelete, onAdminRemoved }: Props) {
  const toggleFavorite = useAdoptStore((s) => s.toggleFavorite);
  const isFavorite = useAdoptStore((s) => s.isFavorite(listing.id));
  const { openMedia } = useMediaLightbox();
  const [pop, setPop] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const layoutId = `adopt-cat-photo-${listing.id}`;
  const detailPath = `/adopt/${listing.id}`;

  function onHeartClick(e: ReactMouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(listing.id);
    setPop(true);
    window.setTimeout(() => setPop(false), 380);
  }

  return (
    <article className="adopt-card">
      <div className="adopt-card__img-wrap">
        <Link to={detailPath} className="adopt-card__link" aria-label={`Open profile: ${listing.petName ?? listing.title}`}>
          <motion.div
            layoutId={layoutId}
            layout
            style={{ width: "100%", height: "100%", position: "relative" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            {listing.photoUrl ? (
              <button
                type="button"
                className="adopt-card__photo-zoom"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openMedia(listing.photoUrl!, listing.petName ?? listing.title);
                }}
                aria-label={`View photo: ${listing.petName ?? listing.title}`}
              >
                <motion.img
                  src={listing.photoUrl}
                  alt=""
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  whileHover={{ scale: 1.06 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </button>
            ) : (
              <div className="adopt-card__placeholder">
                <AdoptPlaceholderCat />
              </div>
            )}
          </motion.div>
        </Link>
        <span className="adopt-card__vibe">{vibeLabelForListing(listing)}</span>
        <span className="adopt-card__verified">
          <BadgeCheck size={12} strokeWidth={2.5} aria-hidden />
          Verified
        </span>
        {adminDelete ? (
          <>
            <button
              type="button"
              title="Remove listing"
              aria-label="Remove this adoption listing"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmRemove(true);
              }}
              style={{
                position: "absolute",
                top: "0.55rem",
                right: "0.55rem",
                zIndex: 3,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2.35rem",
                height: "2.35rem",
                borderRadius: 999,
                border: "1px solid rgba(180, 35, 24, 0.4)",
                color: "#b42318",
                background: "color-mix(in srgb, var(--color-surface) 92%, transparent)",
                backdropFilter: "blur(12px)",
                cursor: "pointer",
              }}
            >
              <Trash2 size={16} strokeWidth={2} aria-hidden />
            </button>
            <AdminAdoptRemoveDialog
              open={confirmRemove}
              onOpenChange={setConfirmRemove}
              listingId={listing.id}
              onRemoved={() => {
                if (isFavorite) toggleFavorite(listing.id);
                onAdminRemoved?.(listing.id);
              }}
            />
          </>
        ) : null}
        {!hideLove ? (
          <div className="adopt-card__actions">
            <motion.button
              type="button"
              className="adopt-heart-btn"
              data-active={isFavorite}
              aria-label={isFavorite ? "Remove from love list" : "Add to love list"}
              onClick={onHeartClick}
              animate={pop ? { scale: [1, 1.28, 1] } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 12 }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart size={20} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2} />
            </motion.button>
          </div>
        ) : null}
      </div>
      <div className="adopt-card__footer">
        <Link to={detailPath} className="adopt-card__footer-cat" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <h3 className="adopt-card__name">{listing.petName ?? listing.title}</h3>
          <p className="adopt-card__meta">{listing.breed ?? "Mixed"}</p>
        </Link>
        <Link
          to={`/users/${listing.shelterOwnerUserId}`}
          className="adopt-card__shelter-row pm-seller"
          onClick={(e) => e.stopPropagation()}
          aria-label={`View ${listing.shelterName} profile`}
        >
          {listing.shelterAvatarUrl ? (
            <img src={listing.shelterAvatarUrl} alt="" className="pm-seller__avatar" />
          ) : (
            <span
              className="pm-seller__avatar"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.58rem",
                fontWeight: 700,
                background: "#eef6f4",
                color: "var(--color-primary-dark)",
              }}
              aria-hidden
            >
              {userInitials(listing.shelterName)}
            </span>
          )}
          <span className="adopt-card__shelter-name">{listing.shelterName}</span>
          <BadgeCheck size={12} strokeWidth={2.5} aria-hidden style={{ color: "#2d6a4f", flexShrink: 0 }} />
        </Link>
      </div>
    </article>
  );
}
