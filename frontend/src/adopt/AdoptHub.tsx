import { motion } from "framer-motion";
import { BadgeCheck, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { AdoptionListingDto, ShelterDto } from "../types";
import { LIFESTYLE_FILTERS, listingMatchesFilter } from "./adoptPersonality";
import { AdoptCard } from "./AdoptCard";
import "./adopt.css";
import { useAdoptStore } from "./useAdoptStore";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.055 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38 } },
};

export function AdoptHub() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdoptionListingDto[]>([]);
  const [shelter, setShelter] = useState<ShelterDto | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const filterCriteria = useAdoptStore((s) => s.filterCriteria);
  const setFilterCriteria = useAdoptStore((s) => s.setFilterCriteria);
  const favorites = useAdoptStore((s) => s.favorites);

  useEffect(() => {
    setLoadErr(null);
    void api<AdoptionListingDto[]>("/api/adoptable-cats")
      .then(setRows)
      .catch(() => {
        setRows([]);
        setLoadErr("We couldn’t load adoptable cats. Try again shortly.");
      });
    void api<ShelterDto | null>("/api/adopt/shelters/mine")
      .then((s) => setShelter(s))
      .catch(() => setShelter(null));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => listingMatchesFilter(r, filterCriteria)),
    [rows, filterCriteria],
  );

  const loveList = useMemo(() => rows.filter((r) => favorites.includes(r.id)), [rows, favorites]);

  const showShelterStatus =
    user?.accountType === "SHELTER" &&
    shelter &&
    (shelter.status === "PENDING" || shelter.status === "REJECTED" || shelter.status === "APPROVED");

  return (
    <div className="adopt-hub">
      <div className="adopt-toolbar">
        <div style={{ flex: 1 }} />
        {user?.accountType === "SHELTER" && (
          <Link className="ph-btn ph-btn-ghost" to="/adopt/shelter">
            Shelter & verification
          </Link>
        )}
        {user?.accountType === "SHELTER" && shelter?.status === "APPROVED" && (
          <Link className="ph-btn ph-btn-accent" to="/adopt/new">
            New listing
          </Link>
        )}
      </div>

      <div className="adopt-hero">
        <div className="adopt-hero__badge">
          <BadgeCheck size={14} strokeWidth={2.5} aria-hidden />
          Verified shelters only
        </div>
        <h1 className="adopt-hero__title">Paw Adopt — meet cats from trusted partners</h1>
        <p className="adopt-hero__lede">
          Every cat here is listed by a shelter profile checked by our team. Fall in love, save hearts to your Love
          List, then message the shelter in-app—just like Paw Market.
        </p>
      </div>

      {showShelterStatus && shelter && (
        <div
          className="adopt-status-card"
          data-tone={
            shelter.status === "APPROVED" ? "success" : shelter.status === "PENDING" ? "pending" : "rejected"
          }
        >
          <div style={{ flex: 1 }}>
            <h3>{shelter.name}</h3>
            {shelter.status === "APPROVED" && (
              <p>
                You’re verified. Your listings are live for adopters; keep photos and stories fresh so the right homes
                find each cat.
              </p>
            )}
            {shelter.status === "PENDING" && (
              <p>
                {!shelter.profileCompletedAt ? (
                  <>
                    <strong>Finish your shelter dossier.</strong> Open Shelter & verification to answer the full
                    questionnaire and upload nonprofit, licensing, insurance, and SOP documents—then mark complete for
                    admin review.
                  </>
                ) : (
                  <>
                    <strong>Verification in progress.</strong> Your dossier is on file; an admin is reviewing your
                    shelter. You’ll be able to publish cats once approved.
                  </>
                )}
              </p>
            )}
            {shelter.status === "REJECTED" && (
              <p>
                This application wasn’t approved. Please reach out through support if you believe this was a mistake, or
                update your details and re-apply when invited.
              </p>
            )}
          </div>
          {shelter.status === "APPROVED" && (
            <Link className="ph-btn ph-btn-accent" to="/adopt/new" style={{ alignSelf: "center" }}>
              Post a cat
            </Link>
          )}
        </div>
      )}

      {loveList.length > 0 && (
        <section style={{ marginBottom: "1.75rem" }} id="love-list">
          <h2 className="adopt-detail__section-title" style={{ marginBottom: "0.65rem" }}>
            Your Love List ({loveList.length})
          </h2>
          <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", margin: "0 0 1rem", lineHeight: 1.55 }}>
            Tap through to read their story, or jump straight to messages with the shelter—same flow as contacting a
            seller on the market.
          </p>
          <div className="adopt-love-strip">
            {loveList.map((l) => (
              <article key={l.id} className="adopt-love-card">
                <Link to={`/adopt/${l.id}`} className="adopt-love-card__media" style={{ display: "block" }}>
                  {l.photoUrl ? (
                    <img src={l.photoUrl} alt="" />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--color-muted)",
                      }}
                    >
                      No photo
                    </div>
                  )}
                </Link>
                <div className="adopt-love-card__body">
                  <div className="adopt-love-card__name">{l.petName ?? l.title}</div>
                  <div className="adopt-love-card__actions">
                    <Link className="ph-btn ph-btn-ghost" to={`/adopt/${l.id}`} style={{ fontSize: "0.82rem" }}>
                      View profile
                    </Link>
                    <Link
                      className="ph-btn ph-btn-primary"
                      to={`/adopt/${l.id}?contact=1`}
                      style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <MessageCircle size={15} aria-hidden />
                      Message shelter
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="adopt-filter-scroller adopt-glass">
        {LIFESTYLE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="adopt-filter-pill"
            data-active={filterCriteria === f.id}
            onClick={() => setFilterCriteria(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadErr && (
        <p role="alert" style={{ color: "#b42318", marginBottom: "1rem" }}>
          {loadErr}
        </p>
      )}

      {filtered.length === 0 && !loadErr ? (
        <p style={{ color: "var(--color-muted)", fontSize: "1.05rem", lineHeight: 1.65 }}>
          No cats match this vibe right now. Try another filter or check back soon.
        </p>
      ) : (
        <motion.div className="adopt-masonry" variants={container} initial="hidden" animate="show">
          {filtered.map((l) => (
            <motion.div key={l.id} className="adopt-masonry__item" variants={item}>
              <AdoptCard listing={l} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
