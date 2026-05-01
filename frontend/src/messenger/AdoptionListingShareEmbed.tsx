import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userInitials } from "../shell/userDisplay";
import { api } from "../api/client";
import { useMediaLightbox } from "../components/media/MediaLightboxContext";
import type { AdoptionListingDto } from "../types";

type Props = {
  listingId: number;
  mine: boolean;
};

const cache = new Map<number, AdoptionListingDto>();

function truncate(s: string | null | undefined, max: number): string {
  if (!s?.trim()) return "";
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/**
 * Rich preview for a shared Paw Adopt cat (same pattern as Paw Market — tap opens listing profile, no raw URL in bubble).
 */
export function AdoptionListingShareEmbed({ listingId, mine }: Props) {
  const { openMedia } = useMediaLightbox();
  const [listing, setListing] = useState<AdoptionListingDto | null>(() => cache.get(listingId) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hit = cache.get(listingId);
    if (hit) {
      setListing(hit);
      setFailed(false);
      return;
    }
    let cancelled = false;
    void api<AdoptionListingDto>(`/api/adopt/listings/${listingId}`)
      .then((l) => {
        if (cancelled) return;
        cache.set(listingId, l);
        setListing(l);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) {
          setListing(null);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  if (failed) {
    return null;
  }

  if (!listing) {
    return (
      <div className={"ph-listing-embed ph-listing-embed--skeleton" + (mine ? " ph-listing-embed--mine" : "")}>
        <div className="ph-listing-embed__thumb-skel" />
        <div className="ph-listing-embed__meta-skel" />
      </div>
    );
  }

  const headline = listing.petName?.trim() || listing.title;
  const sub = truncate(listing.description, 140) || truncate(listing.breed, 80);

  return (
    <div className={"ph-listing-embed" + (mine ? " ph-listing-embed--mine" : "")}>
      <button
        type="button"
        className="ph-listing-embed__thumb ph-listing-embed__thumb--open"
        disabled={!listing.photoUrl}
        onClick={() => listing.photoUrl && openMedia(listing.photoUrl, headline)}
        aria-label={listing.photoUrl ? "View listing photo full size" : undefined}
      >
        {listing.photoUrl ? (
          <img src={listing.photoUrl} alt="" />
        ) : (
          <span className="ph-listing-embed__placeholder">🐾</span>
        )}
      </button>
      <Link
        to={`/adopt/${listing.id}`}
        className="ph-listing-embed__body"
        aria-label={`${headline}, listed by ${listing.shelterName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="ph-listing-embed__label">Paw Adopt</span>
        <span className="ph-listing-embed__title">{headline}</span>
        <div className="pm-seller ph-listing-embed__shelter" style={{ marginTop: "0.35rem", pointerEvents: "none" }}>
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
          <span style={{ fontWeight: 600, color: "var(--color-primary-dark)" }}>{listing.shelterName}</span>
        </div>
        {sub ? <span className="ph-listing-embed__price" style={{ fontWeight: 500, opacity: 0.92 }}>{sub}</span> : null}
      </Link>
    </div>
  );
}
