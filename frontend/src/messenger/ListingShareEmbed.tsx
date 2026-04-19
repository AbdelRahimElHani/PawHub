import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { PawListingDto } from "../types";

const cache = new Map<number, PawListingDto>();

type Props = {
  listingId: number;
  mine: boolean;
};

/**
 * Rich preview for a shared Paw Market listing (no raw URL — tap card to open listing).
 */
export function ListingShareEmbed({ listingId, mine }: Props) {
  const [listing, setListing] = useState<PawListingDto | null>(() => cache.get(listingId) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hit = cache.get(listingId);
    if (hit) {
      setListing(hit);
      setFailed(false);
      return;
    }
    let cancelled = false;
    void api<PawListingDto>(`/api/paw/listings/${listingId}`)
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

  const cover = listing.imageUrls?.[0] ?? listing.photoUrl;
  const priceLabel = listing.isFree ? "FREE" : `$${(listing.priceCents / 100).toFixed(2)}`;

  return (
    <Link
      to={`/market/${listing.id}`}
      className={"ph-listing-embed" + (mine ? " ph-listing-embed--mine" : "")}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="ph-listing-embed__thumb">
        {cover ? <img src={cover} alt="" /> : <span className="ph-listing-embed__placeholder">🐾</span>}
      </div>
      <div className="ph-listing-embed__body">
        <span className="ph-listing-embed__label">Paw Market</span>
        <span className="ph-listing-embed__title">{listing.title}</span>
        <span className="ph-listing-embed__price">{priceLabel}</span>
      </div>
    </Link>
  );
}
