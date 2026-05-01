import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { ExternalLink, GripVertical, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { HubEditorialJson } from "../api/hubApiTypes";
import { HubConfirmDialog } from "../components/HubConfirmDialog";
import { EDITORIAL_TOPICS } from "../hubConstants";
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
    sectionTitle: j.sectionTitle ?? undefined,
  };
}

function groupBySection<T extends { sectionTitle?: string | null }>(items: T[]): { key: string; label: string | null; items: T[] }[] {
  const keys: string[] = [];
  const m = new Map<string, T[]>();
  for (const it of items) {
    const key = (it.sectionTitle ?? "").trim();
    if (!m.has(key)) {
      m.set(key, []);
      keys.push(key);
    }
    m.get(key)!.push(it);
  }
  return keys.map((key) => ({ key, label: key ? key : null, items: m.get(key)! }));
}

function mergeEditorialOrder(all: HubEditorialJson[], topic: string, fromId: string, toId: string): string[] {
  const F = [...all].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  const inView = (x: HubEditorialJson) => topic === "all" || x.topicId === topic;
  const viewIds = F.filter(inView).map((x) => x.id);
  const fromI = viewIds.indexOf(fromId);
  const toI = viewIds.indexOf(toId);
  if (fromI < 0 || toI < 0) return F.map((x) => x.id);
  const next = [...viewIds];
  next.splice(fromI, 1);
  next.splice(toI, 0, fromId);
  const merged: string[] = [];
  let vi = 0;
  for (const x of F) {
    if (inView(x)) merged.push(next[vi++]!);
    else merged.push(x.id);
  }
  return merged;
}

export function EditorialPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [rows, setRows] = useState<HubEditorialJson[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoadErr(null);
    void api<HubEditorialJson[]>("/api/hub/editorial")
      .then((r) => setRows([...r].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))))
      .catch(() => {
        setRows([]);
        setLoadErr("Could not load editorial picks.");
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const list = useMemo(() => {
    const mapped = rows.map(mapEditorial);
    if (topic === "all") return mapped;
    return mapped.filter((e) => e.topicId === topic);
  }, [rows, topic]);

  const featured = list.length ? (list.find((e) => e.featured) ?? list[0]) : undefined;
  const rest = featured ? list.filter((e) => e.id !== featured.id) : [];
  const restGrouped = useMemo(() => groupBySection(rest), [rest]);

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
      sectionTitle: ((fd.get("sectionTitle") as string) || "").trim() || null,
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

  async function onReorder(fromId: string, toId: string) {
    if (!isAdmin) return;
    const orderedIds = mergeEditorialOrder(rows, topic, fromId, toId);
    await api("/api/admin/hub/editorial/reorder", { method: "POST", body: JSON.stringify({ orderedIds }) });
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
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Section title (optional)</label>
                  <input name="sectionTitle" className="ph-input" style={{ width: "100%", marginBottom: "0.5rem" }} placeholder="e.g. Deep dives" />
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

      {isAdmin && (
        <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginBottom: "0.75rem" }}>
          Drag the handle on a card to reorder within the current topic tab.
        </p>
      )}

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
            </div>
          </div>
        </motion.section>
      )}

      {restGrouped.map((g) => (
        <section key={g.key || "__ungrouped__"} style={{ marginBottom: "1.75rem" }}>
          {g.label && (
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.1rem",
                margin: "0 0 0.75rem",
                color: "var(--hub-charcoal)",
                borderBottom: "1px solid var(--color-border)",
                paddingBottom: "0.35rem",
              }}
            >
              {g.label}
            </h2>
          )}
          <div className="hub-editorial-grid">
            {g.items.map((a, i) => (
              <motion.article
                key={a.id}
                className="ph-surface hub-editorial-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                onDragOver={
                  isAdmin
                    ? (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }
                    : undefined
                }
                onDrop={
                  isAdmin
                    ? (e) => {
                        e.preventDefault();
                        const from = e.dataTransfer.getData("application/x-pawhub-editorial-id");
                        if (from && from !== a.id) void onReorder(from, a.id);
                      }
                    : undefined
                }
              >
                {isAdmin && (
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-pawhub-editorial-id", a.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="ph-btn ph-btn-ghost"
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                    style={{ position: "absolute", top: 8, left: 8, zIndex: 3, padding: "0.2rem", cursor: "grab" }}
                  >
                    <GripVertical size={16} />
                  </button>
                )}
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
                <a className="hub-editorial-card__link" href={a.url} target="_blank" rel="noopener noreferrer">
                  {a.imageUrl ? (
                    <img className="hub-editorial-card__media" src={a.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="hub-editorial-card__media-placeholder" aria-hidden />
                  )}
                  <div className="hub-editorial-card__body">
                    <p className="hub-meta" style={{ margin: 0 }}>
                      {a.sourceLabel}
                    </p>
                    <h2 className="hub-editorial-card__title">{a.title}</h2>
                    <p className="hub-editorial-card__dek">{a.dek}</p>
                    <span className="hub-tag" style={{ marginTop: "0.25rem", display: "inline-block" }}>
                      {EDITORIAL_TOPICS.find((x) => x.id === a.topicId)?.label ?? a.topicId}
                    </span>
                  </div>
                </a>
                <div className="hub-editorial-card__footer">
                  <a className="ph-btn ph-btn-primary" style={{ fontSize: "0.88rem", textDecoration: "none" }} href={a.url} target="_blank" rel="noopener noreferrer">
                    Open article <ExternalLink size={14} style={{ marginLeft: "0.25rem" }} aria-hidden />
                  </a>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      ))}

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
