import * as Dialog from "@radix-ui/react-dialog";
import Fuse from "fuse.js";
import { BookOpen, ExternalLink, MessageSquare, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EDITORIAL_TOPICS, EXTERNAL_LINKS, FAQ_ITEMS, FAQ_CATEGORY_META } from "../../mockData";

type Hit =
  | { kind: "faq"; id: string; title: string; subtitle: string }
  | { kind: "link"; id: string; title: string; subtitle: string; url: string };

function buildHits(): Hit[] {
  const faq: Hit[] = FAQ_ITEMS.map((f) => ({
    kind: "faq",
    id: f.id,
    title: f.question,
    subtitle: `${FAQ_CATEGORY_META.find((c) => c.id === f.categoryId)?.label ?? "FAQ"} · knowledge base`,
  }));
  const links: Hit[] = EXTERNAL_LINKS.map((e) => ({
    kind: "link",
    id: e.id,
    title: e.title,
    subtitle: `${e.sourceLabel} · ${EDITORIAL_TOPICS.find((t) => t.id === e.topicId)?.label ?? e.topicId}`,
    url: e.url,
  }));
  return [...faq, ...links];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const fuse = useMemo(() => {
    const hits = buildHits();
    return new Fuse(hits, {
      keys: [
        { name: "title", weight: 0.55 },
        { name: "subtitle", weight: 0.35 },
      ],
      threshold: 0.28,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
  }, []);

  const results = useMemo(() => {
    const hits = buildHits();
    if (!query.trim()) return hits.slice(0, 16);
    return fuse.search(query.trim()).map((r) => r.item);
  }, [fuse, query]);

  const onSelect = useCallback(
    (h: Hit) => {
      setOpen(false);
      setQuery("");
      if (h.kind === "faq") navigate(`/hub/faq#${h.id}`);
      else window.open(h.url, "_blank", "noopener,noreferrer");
    },
    [navigate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="ph-btn ph-btn-ghost" style={{ gap: "0.5rem", fontSize: "0.88rem" }} aria-label="Open search">
          <Search size={18} aria-hidden />
          <span>Search</span>
          <span className="hub-kbd">{typeof navigator !== "undefined" && navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}K</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="hub-dialog-overlay" />
        <Dialog.Content className="hub-dialog-content" aria-describedby={undefined}>
          <Dialog.Title className="hub-sr-only">Search PawHub Learn</Dialog.Title>
          <div className="hub-dialog-search-row">
            <Search size={20} color="var(--color-muted)" aria-hidden />
            <input
              autoFocus
              placeholder="Search FAQs and editorial links…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search"
            />
          </div>
          <div className="hub-dialog-list" role="listbox">
            {results.length === 0 ? (
              <p style={{ padding: "1rem", color: "var(--color-muted)", margin: 0 }}>No matches — try different words.</p>
            ) : (
              results.map((h) => (
                <button
                  key={`${h.kind}-${h.id}`}
                  type="button"
                  className="hub-search-hit"
                  role="option"
                  onClick={() => onSelect(h)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    {h.kind === "faq" ? <MessageSquare size={16} aria-hidden /> : <BookOpen size={16} aria-hidden />}
                    <strong style={{ fontWeight: 600 }}>{h.title}</strong>
                    {h.kind === "link" && <ExternalLink size={14} style={{ opacity: 0.7 }} aria-hidden />}
                  </span>
                  <small>{h.subtitle}</small>
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
