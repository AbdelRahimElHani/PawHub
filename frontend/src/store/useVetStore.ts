import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PawvetTriageCaseDto } from "../types/pawvetTriage";
import { triageDtoToMedicalCase } from "../types/pawvetTriage";

export type VetVerificationStatus = "pending" | "verified" | "rejected";

export type VetApplication = {
  id: string;
  userId: number;
  displayName: string;
  licenseNumber: string;
  university: string;
  credentialsDataUrl?: string;
  status: VetVerificationStatus;
  rejectionReason?: string;
  submittedAt: string;
};

export type CaseUrgency = "routine" | "soon" | "urgent";

export type CaseStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export type CaseChatMessage = {
  id: string;
  caseId: string;
  sender: "user" | "vet" | "system";
  body: string;
  at: string;
};

/** Cat profile copied into the case at filing time (sanctuary cat or manual entry). */
export type CatCaseSnapshot = {
  source: "sanctuary" | "manual";
  name: string;
  breed: string | null;
  ageMonths: number | null;
  gender: "MALE" | "FEMALE" | null;
  bio: string | null;
  primaryPhotoUrl: string | null;
  birthday: string | null;
};

export type CaseAttachment = {
  id: string;
  kind: "image" | "video";
  fileName: string;
  mimeType: string;
  /** Base64 data URL — present in memory; omitted when persisted to localStorage to avoid quota errors. */
  dataUrl?: string;
  /** Public URL after upload to the API (used for cross-session / vet triage board). */
  publicUrl?: string;
};

export type MedicalCase = {
  id: string;
  ownerUserId: number;
  catId: number | null;
  catName: string;
  catSnapshot?: CatCaseSnapshot;
  symptoms: string;
  mediaDescription: string;
  attachments?: CaseAttachment[];
  urgency: CaseUrgency;
  status: CaseStatus;
  vetUserId?: number;
  vetName?: string;
  vetAvatarUrl?: string | null;
  createdAt: string;
  resolvedAt?: string;
  messages: CaseChatMessage[];
  summary?: string;
};

export type VetReview = {
  id: string;
  caseId: string;
  vetUserId: number;
  ownerUserId: number;
  stars: number;
  feedback: string;
  at: string;
};

export type VetReport = {
  id: string;
  caseId: string;
  vetUserId: number;
  reporterUserId: number;
  reason: string;
  at: string;
};

type VetState = {
  vetApplications: VetApplication[];
  cases: MedicalCase[];
  reviews: VetReview[];
  reports: VetReport[];

  submitVetApplication: (app: Omit<VetApplication, "id" | "status" | "submittedAt"> & { id?: string }) => void;
  approveVet: (applicationId: string) => void;
  rejectVet: (applicationId: string, reason: string) => void;

  fileCase: (input: {
    ownerUserId: number;
    catId: number | null;
    catName: string;
    catSnapshot?: CatCaseSnapshot;
    symptoms: string;
    mediaDescription: string;
    attachments?: CaseAttachment[];
    urgency: CaseUrgency;
  }) => MedicalCase;

  claimCase: (params: {
    caseId: string;
    vetUserId: number;
    vetName: string;
    vetAvatarUrl: string | null;
  }) => void;

  appendMessage: (caseId: string, sender: "user" | "vet" | "system", body: string) => void;
  closeCaseWithSummary: (caseId: string, summary: string) => void;

  addReview: (input: Omit<VetReview, "id" | "at">) => void;
  reportVet: (input: Omit<VetReport, "id" | "at">) => void;

  isVetVerified: (userId: number) => boolean;
  getVetRating: (vetUserId: number) => { average: number; count: number };

  /** Merge server-backed PawVet triage cases (same id replaces any local-only row). */
  mergeCasesFromApi: (rows: PawvetTriageCaseDto[]) => void;
};

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useVetStore = create<VetState>()(
  persist(
    (set, get) => ({
      vetApplications: [],
      cases: [],
      reviews: [],
      reports: [],

      submitVetApplication: (app) => {
        const row: VetApplication = {
          ...app,
          id: app.id ?? uid("vapp"),
          status: "pending",
          submittedAt: new Date().toISOString(),
        };
        set((s) => ({ vetApplications: [row, ...s.vetApplications.filter((x) => x.id !== row.id)] }));
      },

      approveVet: (applicationId) => {
        set((s) => ({
          vetApplications: s.vetApplications.map((a) =>
            a.id === applicationId ? { ...a, status: "verified" as const, rejectionReason: undefined } : a,
          ),
        }));
      },

      rejectVet: (applicationId, reason) => {
        set((s) => ({
          vetApplications: s.vetApplications.map((a) =>
            a.id === applicationId ? { ...a, status: "rejected" as const, rejectionReason: reason } : a,
          ),
        }));
      },

      fileCase: (input) => {
        const c: MedicalCase = {
          id: uid("case"),
          ownerUserId: input.ownerUserId,
          catId: input.catId,
          catName: input.catName,
          catSnapshot: input.catSnapshot,
          symptoms: input.symptoms,
          mediaDescription: input.mediaDescription,
          attachments: input.attachments?.length ? input.attachments : undefined,
          urgency: input.urgency,
          status: "OPEN",
          createdAt: new Date().toISOString(),
          messages: [
            {
              id: uid("msg"),
              caseId: "",
              sender: "system",
              body: "Case filed. A verified vet will review and may claim this case shortly.",
              at: new Date().toISOString(),
            },
          ],
        };
        c.messages[0] = { ...c.messages[0], caseId: c.id };
        set((s) => ({ cases: [c, ...s.cases] }));
        return c;
      },

      claimCase: ({ caseId, vetUserId, vetName, vetAvatarUrl }) => {
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === caseId && c.status === "OPEN"
              ? {
                  ...c,
                  status: "IN_PROGRESS" as const,
                  vetUserId,
                  vetName,
                  vetAvatarUrl,
                  messages: [
                    ...c.messages,
                    {
                      id: uid("msg"),
                      caseId,
                      sender: "system",
                      body: `${vetName} has claimed this case and will assist you here.`,
                      at: new Date().toISOString(),
                    },
                  ],
                }
              : c,
          ),
        }));
      },

      appendMessage: (caseId, sender, body) => {
        const msg: CaseChatMessage = {
          id: uid("msg"),
          caseId,
          sender,
          body,
          at: new Date().toISOString(),
        };
        set((s) => ({
          cases: s.cases.map((c) => (c.id === caseId ? { ...c, messages: [...c.messages, msg] } : c)),
        }));
      },

      closeCaseWithSummary: (caseId, summary) => {
        set((s) => ({
          cases: s.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  status: "RESOLVED" as const,
                  summary,
                  resolvedAt: new Date().toISOString(),
                  messages: [
                    ...c.messages,
                    {
                      id: uid("msg"),
                      caseId,
                      sender: "system",
                      body: `Case closed. Medical summary:\n\n${summary}`,
                      at: new Date().toISOString(),
                    },
                  ],
                }
              : c,
          ),
        }));
      },

      addReview: (input) => {
        const r: VetReview = {
          ...input,
          id: uid("rev"),
          at: new Date().toISOString(),
        };
        set((s) => ({ reviews: [r, ...s.reviews] }));
      },

      reportVet: (input) => {
        const r: VetReport = {
          ...input,
          id: uid("rep"),
          at: new Date().toISOString(),
        };
        set((s) => ({ reports: [r, ...s.reports] }));
      },

      isVetVerified: (userId) => {
        return get().vetApplications.some((a) => a.userId === userId && a.status === "verified");
      },

      getVetRating: (vetUserId) => {
        const list = get().reviews.filter((r) => r.vetUserId === vetUserId);
        if (!list.length) return { average: 0, count: 0 };
        const sum = list.reduce((a, r) => a + r.stars, 0);
        return { average: sum / list.length, count: list.length };
      },

      mergeCasesFromApi: (rows) => {
        if (!rows.length) return;
        const incoming = rows.map(triageDtoToMedicalCase);
        set((s) => {
          const byId = new Map(s.cases.map((c) => [c.id, c]));
          for (const c of incoming) {
            byId.set(c.id, c);
          }
          return { cases: Array.from(byId.values()) };
        });
      },
    }),
    {
      name: "pawvet_store_v3",
      /** Do not persist huge base64 blobs — keeps submit working; previews survive until you refresh the tab. */
      partialize: (state) => ({
        vetApplications: state.vetApplications,
        cases: state.cases.map((c) => ({
          ...c,
          attachments: c.attachments?.map(({ dataUrl: _dataUrl, ...meta }) => meta),
        })),
        reviews: state.reviews,
        reports: state.reports,
      }),
    },
  ),
);
