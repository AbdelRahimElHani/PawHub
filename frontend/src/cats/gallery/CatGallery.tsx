import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCatSanctuaryStore } from "../useCatSanctuaryStore";
import { CatCard } from "./CatCard";
import { AddCatDrawer } from "../drawer/AddCatDrawer";
import { useState } from "react";

export function CatGallery() {
  const nav = useNavigate();
  const cats = useCatSanctuaryStore((s) => s.cats);
  const loading = useCatSanctuaryStore((s) => s.loading);
  const error = useCatSanctuaryStore((s) => s.error);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="cats-gallery-wrap">
      <div className="cats-sanctuary-hero">
        <div className="cats-hero-row">
          <div className="cats-hero-text">
            <h1>My Cats</h1>
            <p>Your cats live here — open a card to see photos, bio, and everything we know about them.</p>
          </div>
          <button type="button" className="cats-add-cat-btn" onClick={() => setDrawerOpen(true)}>
            <Plus size={18} strokeWidth={2.5} aria-hidden />
            Add cat
          </button>
        </div>
      </div>

      {error ? <p className="cats-err">{error}</p> : null}

      {loading && cats.length === 0 ? (
        <div className="cats-empty">
          <div className="cats-paw-spinner-inner" style={{ margin: "0 auto 1rem" }} />
          <p>Loading your cats…</p>
        </div>
      ) : cats.length === 0 ? (
        <motion.div className="cats-empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2>No cats yet</h2>
          <p>Use Add cat to add your first companion.</p>
        </motion.div>
      ) : (
        <motion.div className="cats-bento" layout>
          {cats.map((cat) => (
            <CatCard key={cat.id} cat={cat} onOpen={() => nav(`/cats/${cat.id}`)} />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {drawerOpen ? <AddCatDrawer onClose={() => setDrawerOpen(false)} /> : null}
      </AnimatePresence>
    </div>
  );
}
