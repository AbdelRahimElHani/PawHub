import * as Accordion from "@radix-ui/react-accordion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { ChevronDown, GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FAQ_CATEGORY_META } from "../../hubConstants";
import type { FAQItem } from "../../types";
import { relatedFaqItems } from "../../utils/relatedFaq";

function Paragraphs({ text }: { text: string }) {
  const parts = text.split(/\n\n+/).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}

function FaqCategoryChip({ categoryId }: { categoryId: string }) {
  const meta = FAQ_CATEGORY_META.find((c) => c.id === categoryId);
  return (
    <span className="hub-faq-cat-pill" title={meta?.label ?? categoryId}>
      {meta?.shortLabel ?? categoryId}
    </span>
  );
}

function FaqItemInner({
  item,
  headerExtra,
  allItems,
  dragHandleSlot,
}: {
  item: FAQItem;
  headerExtra?: (item: FAQItem) => ReactNode;
  allItems: FAQItem[];
  dragHandleSlot?: ReactNode;
}) {
  return (
    <>
      <Accordion.Header style={{ display: "flex", alignItems: "stretch", gap: "0.35rem" }}>
        {dragHandleSlot}
        <Accordion.Trigger className="hub-accordion-trigger" style={{ flex: 1, gap: "0.5rem" }}>
          <FaqCategoryChip categoryId={item.categoryId} />
          <span style={{ textAlign: "left", flex: 1 }}>{item.question}</span>
          <ChevronDown className="hub-accordion-chevron" size={18} aria-hidden />
        </Accordion.Trigger>
        {headerExtra ? (
          <div style={{ display: "flex", alignItems: "center", paddingRight: "0.35rem" }} onClick={(e) => e.stopPropagation()}>
            {headerExtra(item)}
          </div>
        ) : null}
      </Accordion.Header>
      <Accordion.Content className="hub-accordion-content">
        <div className="hub-accordion-inner">
          <Paragraphs text={item.answer} />
          {item.isHealthRelated && (
            <aside className="hub-disclaimer" role="note">
              <strong>Medical disclaimer:</strong> This content is educational and not a substitute for professional veterinary diagnosis
              or treatment. If your cat shows sudden behavior changes, pain, or urgent symptoms, contact your veterinarian or emergency
              clinic immediately.
            </aside>
          )}
          <div className="hub-related">
            <h4>Related questions</h4>
            <ul>
              {relatedFaqItems(item, allItems, 3).map((r) => (
                <li key={r.id}>
                  <Link to={`/hub/faq?cat=${encodeURIComponent(r.categoryId)}#${r.id}`}>{r.question}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Accordion.Content>
    </>
  );
}

function SortableFaqRow({
  item,
  headerExtra,
  allItems,
}: {
  item: FAQItem;
  headerExtra?: (item: FAQItem) => ReactNode;
  allItems: FAQItem[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
    zIndex: isDragging ? 3 : 0,
    position: "relative" as const,
  };

  const handle = (
    <button
      type="button"
      className="ph-btn ph-btn-ghost"
      style={{
        padding: "0.25rem",
        minWidth: "auto",
        cursor: isDragging ? "grabbing" : "grab",
        alignSelf: "stretch",
        display: "flex",
        alignItems: "center",
        touchAction: "none",
      }}
      title="Drag to reorder"
      aria-label="Drag to reorder"
      {...listeners}
      {...attributes}
    >
      <GripVertical size={18} aria-hidden />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} id={item.id}>
      <Accordion.Item value={item.id} className="hub-accordion-item">
        <FaqItemInner item={item} headerExtra={headerExtra} allItems={allItems} dragHandleSlot={handle} />
      </Accordion.Item>
    </div>
  );
}

function StaticFaqRow({
  item,
  index,
  headerExtra,
  allItems,
}: {
  item: FAQItem;
  index: number;
  headerExtra?: (item: FAQItem) => ReactNode;
  allItems: FAQItem[];
}) {
  return (
    <motion.div
      id={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Accordion.Item value={item.id} className="hub-accordion-item">
        <FaqItemInner item={item} headerExtra={headerExtra} allItems={allItems} />
      </Accordion.Item>
    </motion.div>
  );
}

export function FaqAccordion({
  items,
  allItemsForRelated,
  openValues,
  onOpenChange,
  headerExtra,
  sortable,
}: {
  items: FAQItem[];
  /** Full FAQ list for “related” links (may be wider than `items`). Defaults to `items`. */
  allItemsForRelated?: FAQItem[];
  openValues: string[];
  onOpenChange: (v: string[]) => void;
  headerExtra?: (item: FAQItem) => ReactNode;
  /** Admin: sortable row (parent must wrap with SortableContext + DndContext). */
  sortable?: boolean;
}) {
  const relatedPool = allItemsForRelated ?? items;
  return (
    <Accordion.Root type="multiple" value={openValues} onValueChange={onOpenChange} className="hub-faq-accordion">
      {items.map((item, index) =>
        sortable ? (
          <SortableFaqRow key={item.id} item={item} headerExtra={headerExtra} allItems={relatedPool} />
        ) : (
          <StaticFaqRow key={item.id} item={item} index={index} headerExtra={headerExtra} allItems={relatedPool} />
        ),
      )}
    </Accordion.Root>
  );
}
