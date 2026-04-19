import { motion } from "framer-motion";
import { BookOpen, HelpCircle, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

const cards = [
  {
    to: "/hub/faq",
    title: "Knowledge Center",
    desc: "Searchable FAQs on behavior, nutrition, health, and life stages.",
    icon: HelpCircle,
    accent: "var(--hub-sage)",
  },
  {
    to: "/hub/editorial",
    title: "Editorial",
    desc: "Curated external articles by topic — opens trusted sites in a new tab.",
    icon: BookOpen,
    accent: "var(--hub-salmon)",
  },
  {
    to: "/hub/community/help",
    title: "Community",
    desc: "Create forums, post threads, comment, and vote — stored locally until you add a backend.",
    icon: MessageSquare,
    accent: "var(--color-primary)",
  },
];

export function HubIndexPage() {
  return (
    <div>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 4vw, 2rem)", margin: "0 0 0.5rem", color: "var(--hub-charcoal)" }}>
          Learn &amp; connect
        </h1>
        <p style={{ margin: 0, color: "var(--color-muted)", maxWidth: "52ch", lineHeight: 1.55 }}>
          A premium reading space for PawHub members — grounded in the same warm palette as the rest of the app, with room to breathe.
        </p>
      </header>

      <div style={{ display: "grid", gap: "1rem" }}>
        {cards.map((c, i) => (
          <motion.div
            key={c.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link
              to={c.to}
              className="ph-surface"
              style={{
                display: "flex",
                gap: "1rem",
                padding: "1.25rem",
                textDecoration: "none",
                color: "inherit",
                borderLeft: `4px solid ${c.accent}`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "var(--hub-sage-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: c.accent,
                }}
              >
                <c.icon size={24} aria-hidden />
              </div>
              <div>
                <h2 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-primary-dark)" }}>{c.title}</h2>
                <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-muted)", lineHeight: 1.5 }}>{c.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
