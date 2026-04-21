import { motion } from "framer-motion";
import { BadgeCheck, Heart } from "lucide-react";
import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { Link } from "react-router-dom";
import type { AdoptionListingDto } from "../types";
import { vibeLabelForListing } from "./adoptPersonality";
import { AdoptPlaceholderCat } from "./AdoptPlaceholderCat";
import { useAdoptStore } from "./useAdoptStore";

type Props = {
  listing: AdoptionListingDto;
};

export function AdoptCard({ listing }: Props) {
  const toggleFavorite = useAdoptStore((s) => s.toggleFavorite);
  const isFavorite = useAdoptStore((s) => s.isFavorite(listing.id));
  const [pop, setPop] = useState(false);

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
              <motion.img
                src={listing.photoUrl}
                alt=""
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
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
      </div>
      <Link to={detailPath} className="adopt-card__footer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        <h3 className="adopt-card__name">{listing.petName ?? listing.title}</h3>
        <p className="adopt-card__meta">
          {listing.breed ?? "Mixed"} · {listing.shelterName}
        </p>
      </Link>
    </article>
  );
}
