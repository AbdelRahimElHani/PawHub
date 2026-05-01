import Fuse from "fuse.js";
import clsx from "clsx";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { HubFaqJson } from "../api/hubApiTypes";
import { FaqAccordion } from "../components/organisms/FaqAccordion";
import { HubConfirmDialog } from "../components/HubConfirmDialog";
import { FAQ_CATEGORY_META } from "../hubConstants";
import type { FaqCategoryId, FAQItem } from "../types";

function mapToFaqItem(j: HubFaqJson): FAQItem {
  return {
    id: j.id,
    categoryId: j.categoryId as FaqCategoryId,
    question: j.question,
    answer: j.answer,
    isHealthRelated: j.healthRelated,
    sectionTitle: j.sectionTitle ?? undefined,
  };
}

function groupFaqBySection(items: FAQItem[]): { key: string; label: string | null; items: FAQItem[] }[] {
  const keys: string[] = [];
  const m = new Map<string, FAQItem[]>();
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

function mergeFaqOrder(all: HubFaqJson[], cat: string | null, fromId: string, toId: string): string[] {
  const F = [...all].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  const inView = (x: HubFaqJson) => !cat || x.categoryId === cat;
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

export function FaqPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCat = searchParams.get("cat");

  const [apiItems, setApiItems] = useState<HubFaqJson[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<FAQItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HubFaqJson | null>(null);

  const reload = useCallback(() => {
    setLoadErr(null);
    void api<HubFaqJson[]>("/api/hub/faq")
      .then((rows) => setApiItems([...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))))
      .catch(() => {
        setApiItems([]);
        setLoadErr("Could not load FAQ from the server.");
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const categoryIds = useMemo(() => {
    const fromData = new Set(apiItems.map((x) => x.categoryId));
    return [...FAQ_CATEGORY_META.map((c) => c.id), ...[...fromData].filter((id) => !FAQ_CATEGORY_META.some((m) => m.id === id))];
  }, [apiItems]);

  const cat: string | null = rawCat && categoryIds.includes(rawCat) ? rawCat : null;

  const items: FAQItem[] = useMemo(() => apiItems.map(mapToFaqItem), [apiItems]);

  const byCategory = useMemo(() => {
    if (!cat) return items;
    return items.filter((f) => f.categoryId === cat);
  }, [items, cat]);

  const fuse = useMemo(
    () =>
      new Fuse(byCategory, {
        keys: [
          { name: "question", weight: 0.6 },
          { name: "answer", weight: 0.4 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
        includeScore: true,
      }),
    [byCategory],
  );

  const displayItems: FAQItem[] = useMemo(() => {
    const t = q.trim();
    if (!t) return byCategory;
    return fuse.search(t).map((r) => r.item);
  }, [byCategory, fuse, q]);

  const [openValues, setOpenValues] = useState<string[]>([]);

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id || apiItems.length === 0) return;
    const row = apiItems.find((x) => x.id === id);
    if (!row) return;
    if (rawCat !== row.categoryId) {
      setSearchParams({ cat: row.categoryId }, { replace: true });
    }
    setOpenValues((o) => [...new Set([...o, id])]);
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [apiItems, rawCat, setSearchParams]);

  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return;
      setOpenValues((o) => [...new Set([...o, id])]);
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const setCat = (next: string | null) => {
    if (next) setSearchParams({ cat: next });
    else setSearchParams({});
  };

  async function submitFaq(e: FormEvent, mode: "add" | "edit") {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const body = {
      id: mode === "edit" && editTarget ? editTarget.id : ((fd.get("id") as string) || "").trim() || null,
      categoryId: fd.get("categoryId") as string,
      question: fd.get("question") as string,
      answer: fd.get("answer") as string,
      healthRelated: fd.get("healthRelated") === "on",
      sortOrder: parseInt(String(fd.get("sortOrder")), 10) || 0,
      sectionTitle: ((fd.get("sectionTitle") as string) || "").trim() || null,
    };
    await api("/api/admin/hub/faq", { method: "POST", body: JSON.stringify(body) });
    setAddOpen(false);
    setEditTarget(null);
    reload();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await api(`/api/admin/hub/faq/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
    setDeleteTarget(null);
    reload();
  }

  async function onReorder(fromId: string, toId: string) {
    if (!isAdmin) return;
    const orderedIds = mergeFaqOrder(apiItems, cat, fromId, toId);
    await api("/api/admin/hub/faq/reorder", { method: "POST", body: JSON.stringify({ orderedIds }) });
    reload();
  }

  const sectioned = useMemo(() => groupFaqBySection(displayItems), [displayItems]);

  return (
    <div>
      <header style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", margin: "0 0 0.35rem", color: "var(--hub-charcoal)" }}>FAQ &amp; Knowledge Center</h1>
          <p style={{ margin: 0, color: "var(--color-muted)", maxWidth: "60ch" }}>
            Filter by topic, then search. Press <kbd className="hub-kbd">Ctrl/⌘ K</kbd> for global search across FAQs and editorial links.
          </p>
        </div>
        {isAdmin && (
          <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
            <Dialog.Trigger asChild>
              <button type="button" className="ph-btn ph-btn-accent" style={{ gap: "0.35rem" }}>
                <Plus size={18} aria-hidden />
                Add FAQ
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="hub-dialog-overlay" />
              <Dialog.Content className="hub-dialog-content" style={{ top: "10%", maxHeight: "88vh" }} aria-describedby={undefined}>
                <Dialog.Title style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-border)", margin: 0, fontFamily: "var(--font-display)" }}>
                  Add FAQ
                </Dialog.Title>
                <form onSubmit={(e) => void submitFaq(e, "add")} style={{ padding: "1rem" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Id (optional)</label>
                  <input name="id" className="ph-input" style={{ width: "100%", marginBottom: "0.5rem" }} />
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Category id</label>
                  <input name="categoryId" className="ph-input" required style={{ width: "100%", marginBottom: "0.5rem" }} placeholder="e.g. general" />
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Section title (optional)</label>
                  <input name="sectionTitle" className="ph-input" style={{ width: "100%", marginBottom: "0.5rem" }} placeholder="e.g. Litter box basics" />
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Question</label>
                  <input name="question" className="ph-input" required style={{ width: "100%", marginBottom: "0.5rem" }} />
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Answer</label>
                  <textarea name="answer" className="ph-textarea" required rows={4} style={{ width: "100%", marginBottom: "0.5rem" }} />
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input name="healthRelated" type="checkbox" /> Health-related
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

      {isAdmin && editTarget && (
        <Dialog.Root open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="hub-dialog-overlay" />
            <Dialog.Content className="hub-dialog-content" style={{ top: "10%", maxHeight: "88vh" }} aria-describedby={undefined}>
              <Dialog.Title style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--color-border)", margin: 0, fontFamily: "var(--font-display)" }}>
                Edit FAQ
              </Dialog.Title>
              <form key={editTarget.id} onSubmit={(e) => void submitFaq(e, "edit")} style={{ padding: "1rem" }}>
                <input type="hidden" name="id" value={editTarget.id} />
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Category id</label>
                <input name="categoryId" className="ph-input" required style={{ width: "100%", marginBottom: "0.5rem" }} defaultValue={editTarget.categoryId} />
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Section title (optional)</label>
                <input name="sectionTitle" className="ph-input" style={{ width: "100%", marginBottom: "0.5rem" }} defaultValue={editTarget.sectionTitle ?? ""} />
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Question</label>
                <input name="question" className="ph-input" required style={{ width: "100%", marginBottom: "0.5rem" }} defaultValue={editTarget.question} />
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Answer</label>
                <textarea name="answer" className="ph-textarea" required rows={4} style={{ width: "100%", marginBottom: "0.5rem" }} defaultValue={editTarget.answer} />
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <input name="healthRelated" type="checkbox" defaultChecked={editTarget.healthRelated} /> Health-related
                </label>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem" }}>Sort order</label>
                <input name="sortOrder" className="ph-input" type="number" defaultValue={editTarget.sortOrder} style={{ width: "100%", marginBottom: "0.75rem" }} />
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button type="button" className="ph-btn ph-btn-ghost" onClick={() => setEditTarget(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="ph-btn ph-btn-primary">
                    Save changes
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {loadErr && <p style={{ color: "#b42318", marginBottom: "0.75rem" }}>{loadErr}</p>}

      <div className="hub-faq-toolbar">
        <nav className="pm-hub-tabs" aria-label="FAQ categories" style={{ flex: 1, flexWrap: "wrap", rowGap: "0.35rem", marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
          <button type="button" className={clsx("pm-hub-tab", !cat && "pm-hub-tab--active")} onClick={() => setCat(null)}>
            All topics
          </button>
          {categoryIds.map((cid) => {
            const meta = FAQ_CATEGORY_META.find((c) => c.id === cid);
            const label = meta?.shortLabel ?? cid;
            return (
              <button key={cid} type="button" className={clsx("pm-hub-tab", cat === cid && "pm-hub-tab--active")} onClick={() => setCat(cid)}>
                {label}
              </button>
            );
          })}
        </nav>
        <div className="hub-faq-search" role="search">
          <Search size={20} color="var(--color-muted)" aria-hidden />
          <input
            type="search"
            placeholder="Search questions & answers in this view…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter FAQ list"
          />
        </div>
      </div>

      {q.trim() && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: "0.88rem", color: "var(--color-muted)", marginTop: 0, marginBottom: "1rem" }}>
          {displayItems.length} match{displayItems.length === 1 ? "" : "es"}
          {cat ? ` in ${FAQ_CATEGORY_META.find((x) => x.id === cat)?.label ?? cat}` : ""}.
        </motion.p>
      )}

      {isAdmin && (
        <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginBottom: "0.75rem" }}>
          Drag the handle beside a question to reorder within this topic view (order is saved for the whole knowledge base).
        </p>
      )}

      {sectioned.map((g) => (
        <section key={g.key || "__ungrouped__"} style={{ marginBottom: "1.5rem" }}>
          {g.label && (
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.1rem",
                margin: "0 0 0.65rem",
                color: "var(--hub-charcoal)",
                borderBottom: "1px solid var(--color-border)",
                paddingBottom: "0.35rem",
              }}
            >
              {g.label}
            </h2>
          )}
          <FaqAccordion
            items={g.items}
            openValues={openValues}
            onOpenChange={setOpenValues}
            adminReorder={isAdmin}
            onReorder={onReorder}
            headerExtra={
              isAdmin
                ? (item) => (
                    <>
                      <button
                        type="button"
                        className="ph-btn ph-btn-ghost"
                        style={{ padding: "0.35rem", minWidth: "auto" }}
                        title="Edit FAQ"
                        aria-label="Edit FAQ"
                        onClick={() => {
                          const row = apiItems.find((x) => x.id === item.id);
                          if (row) setEditTarget(row);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="ph-btn ph-btn-ghost"
                        style={{ padding: "0.35rem", minWidth: "auto" }}
                        title="Remove FAQ"
                        aria-label="Remove FAQ"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )
                : undefined
            }
          />
        </section>
      ))}

      <HubConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this FAQ?"
        description="This question will be removed for all visitors."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
      />
    </div>
  );
}
