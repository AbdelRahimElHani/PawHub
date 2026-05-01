import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AppNotificationDto } from "../../store/useNotificationStore";
import { isModerationDetailKind } from "./moderationKinds";
import { ModerationNoticeDialog } from "./ModerationNoticeDialog";

type ModerationNoticeContextValue = {
  /** Opens the moderation detail dialog when {@code kind} is a moderation notice. */
  openModerationNotice: (n: AppNotificationDto) => void;
};

const ModerationNoticeContext = createContext<ModerationNoticeContextValue | null>(null);

export function useModerationNotice(): ModerationNoticeContextValue {
  const ctx = useContext(ModerationNoticeContext);
  if (!ctx) {
    throw new Error("useModerationNotice must be used within ModerationNoticeProvider");
  }
  return ctx;
}

export function ModerationNoticeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<AppNotificationDto | null>(null);

  const openModerationNotice = useCallback((n: AppNotificationDto) => {
    if (!isModerationDetailKind(n.kind)) return;
    setActive(n);
  }, []);

  const value = useMemo(
    () => ({
      openModerationNotice,
    }),
    [openModerationNotice],
  );

  return (
    <ModerationNoticeContext.Provider value={value}>
      {children}
      <ModerationNoticeDialog n={active} onClose={() => setActive(null)} />
    </ModerationNoticeContext.Provider>
  );
}
