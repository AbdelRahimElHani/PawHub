import type { CaseAttachment, CaseStatus, CaseUrgency, CatCaseSnapshot, MedicalCase } from "../store/useVetStore";

export type PawvetTriageChatMessageDto = {
  id: string;
  sender: string;
  body: string;
  at: string;
};

export type PawvetTriageCaseDto = {
  id: number;
  ownerUserId: number;
  catId: number | null;
  catName: string;
  catSnapshot: Record<string, unknown> | null;
  symptoms: string;
  mediaDescription: string;
  attachmentUrls: string[];
  urgency: string;
  status: string;
  vetUserId: number | null;
  vetName: string | null;
  vetAvatarUrl: string | null;
  createdAt: string;
  resolvedAt: string | null;
  messages: PawvetTriageChatMessageDto[];
  summary: string | null;
};

function guessKindFromUrl(url: string): "image" | "video" {
  const u = url.toLowerCase();
  if (/\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/i.test(u)) return "video";
  return "image";
}

function fileLabelFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const seg = path.split("/").filter(Boolean).pop();
    return seg && seg.length < 120 ? seg : "attachment";
  } catch {
    const i = url.lastIndexOf("/");
    return i >= 0 && i < url.length - 1 ? url.slice(i + 1, i + 80) : "attachment";
  }
}

export function triageDtoToMedicalCase(d: PawvetTriageCaseDto): MedicalCase {
  const urls = Array.isArray(d.attachmentUrls) ? d.attachmentUrls : [];
  const attachments: CaseAttachment[] = urls.map((url, i) => ({
    id: `url_${d.id}_${i}`,
    kind: guessKindFromUrl(url),
    fileName: fileLabelFromUrl(url),
    mimeType: guessKindFromUrl(url) === "video" ? "video/mp4" : "image/jpeg",
    publicUrl: url,
  }));
  const snap = d.catSnapshot as CatCaseSnapshot | undefined;
  return {
    id: String(d.id),
    ownerUserId: d.ownerUserId,
    catId: d.catId ?? null,
    catName: d.catName,
    catSnapshot: snap && typeof snap === "object" ? snap : undefined,
    symptoms: d.symptoms,
    mediaDescription: d.mediaDescription ?? "",
    attachments: attachments.length ? attachments : undefined,
    urgency: d.urgency as CaseUrgency,
    status: d.status as CaseStatus,
    vetUserId: d.vetUserId ?? undefined,
    vetName: d.vetName ?? undefined,
    vetAvatarUrl: d.vetAvatarUrl ?? undefined,
    createdAt: d.createdAt,
    resolvedAt: d.resolvedAt ?? undefined,
    messages: (d.messages ?? []).map((m) => ({
      id: m.id,
      caseId: String(d.id),
      sender: m.sender as "user" | "vet" | "system",
      body: m.body,
      at: m.at,
    })),
    summary: d.summary ?? undefined,
  };
}
