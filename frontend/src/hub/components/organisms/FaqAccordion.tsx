import * as Accordion from "@radix-ui/react-accordion";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
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

export function FaqAccordion({
  items,
  openValues,
  onOpenChange,
  headerExtra,
}: {
  items: FAQItem[];
  openValues: string[];
  onOpenChange: (v: string[]) => void;
  /** e.g. admin delete icon — kept outside the trigger so it doesn’t toggle the accordion */
  headerExtra?: (item: FAQItem) => ReactNode;
}) {
  return (
    <Accordion.Root type="multiple" value={openValues} onValueChange={onOpenChange} className="hub-faq-accordion">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <Accordion.Item value={item.id} className="hub-accordion-item">
            <Accordion.Header style={{ display: "flex", alignItems: "stretch", gap: "0.35rem" }}>
              <Accordion.Trigger className="hub-accordion-trigger" style={{ flex: 1 }}>
                {item.question}
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
                    <strong>Medical disclaimer:</strong> This content is educational and not a substitute for professional veterinary
                    diagnosis or treatment. If your cat shows sudden behavior changes, pain, or urgent symptoms, contact your veterinarian
                    or emergency clinic immediately.
                  </aside>
                )}
                <div className="hub-related">
                  <h4>Related questions</h4>
                  <ul>
                    {relatedFaqItems(item, items, 3).map((r) => (
                      <li key={r.id}>
                        <Link to={`/hub/faq#${r.id}`}>{r.question}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </motion.div>
      ))}
    </Accordion.Root>
  );
}
