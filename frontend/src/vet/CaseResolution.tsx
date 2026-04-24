import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { PawvetTriageCaseDto } from "../types/pawvetTriage";
import { useVetStore } from "../store/useVetStore";
import "../pawvet/pawvet.css";

export function CaseClosePanel({
  caseId,
  onClosed,
}: {
  caseId: string;
  onClosed?: () => void;
}) {
  const mergeCasesFromApi = useVetStore((s) => s.mergeCasesFromApi);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    const id = Number(caseId);
    if (!Number.isFinite(id)) return;
    setBusy(true);
    try {
      const dto = await api<PawvetTriageCaseDto>(`/api/pawvet/triage-cases/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ summary: summary.trim() }),
      });
      mergeCasesFromApi([dto]);
      onClosed?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={submit}
      className="pawvet-glass-card"
      style={{ padding: "1.15rem" }}
    >
      <h3 style={{ margin: "0 0 0.5rem", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", color: "var(--color-primary-dark)" }}>
        <FileText size={20} aria-hidden />
        Medical summary
      </h3>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "var(--color-muted)" }}>
        This summary is shared with the guardian when the case closes.
      </p>
      <textarea
        className="ph-textarea"
        rows={6}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Clinical impression, differentials discussed, home monitoring, red flags, follow-up…"
        style={{ width: "100%", marginBottom: "0.75rem" }}
      />
      <button type="submit" className="ph-btn ph-btn-primary" disabled={!summary.trim() || busy}>
        {busy ? "Closing…" : "Close case"}
      </button>
    </motion.form>
  );
}

/** Full-page resolver for `/vet/case/:caseId/resolve` */
export default function CaseResolution() {
  const { caseId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const cases = useVetStore((s) => s.cases);
  const mergeCasesFromApi = useVetStore((s) => s.mergeCasesFromApi);
  const c = useMemo(() => (caseId ? cases.find((x) => x.id === caseId) : undefined), [cases, caseId]);

  useEffect(() => {
    if (!caseId || !Number.isFinite(Number(caseId))) return;
    let cancelled = false;
    void (async () => {
      try {
        const dto = await api<PawvetTriageCaseDto>(`/api/pawvet/triage-cases/${caseId}`);
        if (!cancelled) mergeCasesFromApi([dto]);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, mergeCasesFromApi]);

  if (!caseId) {
    return <p className="pawvet-shell">Invalid case.</p>;
  }

  if (!c) {
    return (
      <div className="pawvet-shell">
        <p style={{ color: "var(--color-muted)" }}>Case not found.</p>
        <Link className="ph-btn ph-btn-primary" to="/vet">
          Vet dashboard
        </Link>
      </div>
    );
  }

  if (!user || user.userId !== c.vetUserId) {
    return (
      <div className="pawvet-shell">
        <p style={{ color: "var(--color-muted)" }}>Only the assigned veterinarian can close this case.</p>
        <Link className="ph-btn ph-btn-primary" to="/vet">
          Vet dashboard
        </Link>
      </div>
    );
  }

  if (c.status === "RESOLVED") {
    return (
      <div className="pawvet-shell">
        <p style={{ color: "var(--color-muted)" }}>This case is already closed.</p>
        <Link className="ph-btn ph-btn-primary" to="/vet">
          Vet dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="pawvet-shell">
      <Link className="ph-btn ph-btn-ghost" to="/vet" style={{ marginBottom: "1rem", display: "inline-block" }}>
        ← Dashboard
      </Link>
      <CaseClosePanel caseId={caseId} onClosed={() => nav("/vet", { replace: true })} />
    </div>
  );
}
