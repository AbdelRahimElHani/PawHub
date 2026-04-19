import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { Bookmark, ExternalLink, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { HubEditorialJson } from "../api/hubApiTypes";
import { HubConfirmDialog } from "../components/HubConfirmDialog";
import { EDITORIAL_TOPICS } from "../mockData";
import { useSavedArticles } from "../context/SavedArticlesContext";
import type { ExternalLinkEntry } from "../types";

function mapEditorial(j: HubEditorialJson): ExternalLinkEntry {
  return {
    id: j.id,
    title: j.title,
    url: j.url,
    topicId: j.topicId,
    sourceLabel: j.sourceLabel ?? "",
    dek: j.dek ?? "",
    imageUrl: j.imageUrl,
    featured: j.featured,
  };
}

export function EditorialPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { isSaved, toggle } = useSavedArticles();

  const [rows, setRows] = useState<HubEditorialJson[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = () => {
    setLoadErr(null);
    void api<HubEditorialJson[]>("/api/hub/editorial")
      .then((r) => setRows([...r].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))))
      .catch(() => {
        setRows([]);
        setLoadErr("Could not load editorial picks.");
      });
  };

  useEffect(() => {
    reload();
  }, []);

  const list = useMemo(() => {
    const mapped = rows.map(mapEditorial);
    if (topic === "all") return mapped;
    return mapped.filter((e) => e.topicId === topic);
  }, [rows, topic]);

  const featured = list.length ? (list.find((e) => e.featured) ?? list[0]) : undefined;
  const rest = featured ? list.filter((e) => e.id !== featured.id) : [];

  async function submitAdd(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const body = {
      id: ((fd.get("id") as string) || "").trim() || null,
      title: fd.get("title") as string,
      url: fd.get("url") as string,
      topicId: fd.get("topicId") as string,
      sourceLabel: (fd.get("sourceLabel") as string) || null,
      dek: (fd.get("dek") as string) || null,
      imageUrl: (fd.get("imageUrl") as string) || null,
      featured: fd.get("featured") === "on",
      sortOrder: parseInt(String(fd.get("sortOrder")), 10) || 0,
    };
    await api("/api/admin/hub/editorial", { method: "POST", body: JSON.stringify(body) });
    setAddOpen(false);
    reload();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    await api(`/api/admin/hub/editorial/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
    setDeleteId(null);
    reload();
  }

  return (
    <div>
      <header style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", margin: "0 0 0.35rem" }}>Editorial picks</h1>
          <p style={{ margin: 0, color: "var(--color-muted)", maxWidth: "58ch", lineHeight: 1.55 }}>
            Curated links — each card opens the original site in a new tab.
          </p>
        </div>
        {isAdmin && (
          <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
            <Dialog.Trigger asChild>
              <button type="button" className="ph-btn ph-btn-accent" style={{ gap: "0.35rem" }}>
                <Plus size={18} aria-hidden />
                Add article
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="hub-dialog-overlay" />
              <Dialog.Content className="hub-dialog-content" style={{ top: "8%", maxHeight: "90vh" }} aria-describedby={undefined}>
                <Dialog.Title style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-border)", margin: 0, fontFamily: "var(--font-display)" }}>
                  Add or update editorial link
                </Dialog.Title>
                <form onSubmit={(e) => void submitAdd(e)} style={{ padding: "1rem" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Id (optional)</label>
                  <input name="id" className="ph-input" style={{ width: "100%", marginBottom: "0.5rem" }} />
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Title</label>
                  <input name="title" className="ph-input" required style={{ width: "100%", marginBottom: "0.5rem" }} />
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>URL</label>
                  <input name="url" className="ph-input" required style={{ width: "100%", marginBottom: "0.5rem" }} />
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Topic id</label>
                  <select name="topicId" className="ph-input" required style={{ width: "100%", marginBottom: "0.5rem" }} defaultValue="nutrition">
                    {EDITORIAL_TOPICS.filter((t) => t.id !== "all").map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Source label</label>
                  <input name="sourceLabel" className="ph-input" style={{ width: "100%", marginBottom: "0.5rem" }} />
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Short description</label>
                  <textarea name="dek" className="ph-textarea" rows={2} style={{ width: "100%", marginBottom: "0.5rem" }} />
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Image URL</label>
                  <input name="imageUrl" className="ph-input" style={{ width: "100%", marginBottom: "0.5rem" }} />
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input name="featured" type="checkbox" /> Featured
                  </label>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Sort order</label>
                  <input name="sortOrder" className="ph-input" type="number" defaultValue={0} style={{ width: "100%", marginBottom: "0.75rem" }} />
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setAddOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="ph-btn ph-btn-primary">
                      Save
                    </button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </header>

      {loadErr && <p style={{ color: "#b42318", marginBottom: "0.75rem" }}>{loadErr}</p>}

      <nav className="pm-hub-tabs" aria-label="Topics" style={{ flexWrap: "wrap", rowGap: "0.35rem" }}>
        {EDITORIAL_TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={clsx("pm-hub-tab", topic === t.id && "pm-hub-tab--active")}
            onClick={() => setTopic(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {featured && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="hub-article-hero"
          style={{ marginBottom: "1.5rem", position: "relative" }}
          aria-label="Featured pick"
        >
          {isAdmin && (
            <button
              type="button"
              className="ph-btn ph-btn-ghost"
              title="Remove article"
              aria-label="Remove article"
              onClick={() => setDeleteId(featured.id)}
              style={{ position: "absolute", top: 12, right: 12, zIndex: 2, background: "rgba(0,0,0,0.45)", color: "#fff", borderColor: "transparent" }}
            >
              <Trash2 size={18} />
            </button>
          )}
          {featured.imageUrl ? (
            <img src={featured.imageUrl} alt="" width={1200} height={560} loading="eager" />
          ) : (
            <div style={{ height: 220, background: "linear-gradient(135deg, var(--hub-sage-soft), var(--hub-salmon-soft))" }} />
          )}
          <div className="hub-article-hero-overlay">
            <p className="hub-meta" style={{ color: "rgba(255,255,255,0.88)", marginBottom: "0.35rem" }}>
              {featured.sourceLabel} · External link
            </p>
            <h2 className="hub-article-title" style={{ fontFamily: "var(--hub-serif)" }}>
              {featured.title}
            </h2>
            <p className="hub-article-dek">{featured.dek}</p>
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <a
                className="ph-btn ph-btn-accent"
                href={featured.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                Read on {featured.sourceLabel}
                <ExternalLink size={16} aria-hidden style={{ marginLeft: "0.35rem" }} />
              </a>
              <button
                type="button"
                className="ph-btn ph-btn-ghost"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "rgba(255,255,255,0.35)" }}
                onClick={() => toggle(featured.id)}
              >
                <Bookmark size={18} aria-hidden fill={isSaved(featured.id) ? "currentColor" : "none"} />
                {isSaved(featured.id) ? "Saved" : "Save link"}
              </button>
            </div>
          </div>
        </motion.section>
      )}

      <div className="hub-masonry">
        {rest.map((a, i) => (
          <motion.div key={a.id} className="hub-masonry-item" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
            <article className="ph-surface" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
              {isAdmin && (
                <button
                  type="button"
                  className="ph-btn ph-btn-ghost"
                  title="Remove article"
                  aria-label="Remove article"
                  onClick={() => setDeleteId(a.id)}
                  style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}
                >
                  <Trash2 size={16} />
                </button>
              )}
              <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                {a.imageUrl ? (
                  <img src={a.imageUrl} alt="" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} loading="lazy" />
                ) : (
                  <div style={{ height: 120, background: "var(--hub-sage-soft)" }} />
                )}
                <div style={{ padding: "1rem 1.1rem 1rem" }}>
                  <p className="hub-meta" style={{ marginBottom: "0.35rem" }}>
                    {a.sourceLabel}
                  </p>
                  <h2 style={{ fontFamily: "var(--hub-serif)", fontSize: "1.2rem", margin: "0 0 0.5rem", lineHeight: 1.25, color: "var(--hub-charcoal)" }}>{a.title}</h2>
                  <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-muted)", lineHeight: 1.45 }}>{a.dek}</p>
                  <span className="hub-tag" style={{ marginTop: "0.5rem", display: "inline-block" }}>
                    {EDITORIAL_TOPICS.find((x) => x.id === a.topicId)?.label ?? a.topicId}
                  </span>
                </div>
              </a>
              <div style={{ padding: "0 1rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <a className="ph-btn ph-btn-primary" style={{ fontSize: "0.88rem", textDecoration: "none" }} href={a.url} target="_blank" rel="noopener noreferrer">
                  Open article <ExternalLink size={14} style={{ marginLeft: "0.25rem" }} aria-hidden />
                </a>
                <button type="button" className="ph-btn ph-btn-ghost" style={{ fontSize: "0.85rem" }} onClick={() => toggle(a.id)} aria-label={isSaved(a.id) ? "Remove save" : "Save link"}>
                  <Bookmark size={16} aria-hidden fill={isSaved(a.id) ? "currentColor" : "none"} />
                  {isSaved(a.id) ? "Saved" : "Save"}
                </button>
              </div>
            </article>
          </motion.div>
        ))}
      </div>

      {list.length === 0 && !loadErr && (
        <p style={{ color: "var(--color-muted)" }}>No picks in this topic yet — try “All picks”.</p>
      )}

      <HubConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove this article link?"
        description="Visitors will no longer see this card on the Learn hub."
        confirmLabel="Remove"
        danger
        onConfirm={confirmDelete}
      />
    </div>
  );
}
