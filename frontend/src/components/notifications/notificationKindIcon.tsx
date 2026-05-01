import {
  AlertTriangle,
  Bell,
  Building2,
  HeartPulse,
  MessagesSquare,
  Package,
  Sparkles,
  Stethoscope,
  Star,
  UserPlus,
} from "lucide-react";
import type { AppNotificationDto } from "../../store/useNotificationStore";

export function resolveNotificationIconKey(n: AppNotificationDto): string {
  const raw = (n.iconKind || n.kind || "system").toLowerCase();
  if (raw.includes("vet") || raw === "vet_license_verified" || raw === "vet_new_review" || raw === "pawvet_new_triage_case")
    return "vet";
  if (
    raw.includes("shelter") ||
    raw === "shelter_verified" ||
    raw === "adoption_inquiry" ||
    raw === "adoption_listing_published" ||
    raw === "adoption_inquiry_submitted" ||
    raw === "shelter_application_rejected"
  )
    return "shelter";
  if (raw.includes("message") || raw === "new_message") return "message";
  if (raw.includes("market") || raw.includes("order") || raw.includes("package") || raw.includes("listing_removed"))
    return "package";
  if (raw.includes("health")) return "health";
  if (raw.includes("friend")) return "friend";
  if (raw.includes("forum") || raw.includes("score") || raw === "forum_comment_reply") return "forum";
  if (raw.includes("star") || raw.includes("review")) return "star";
  if (raw.includes("system")) return "system";
  if (raw.includes("urgent")) return "urgent";
  return raw;
}

export function NotificationKindIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const cn = className ?? "";
  const kind = iconKey.toLowerCase();
  switch (kind) {
    case "urgent":
      return <AlertTriangle className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "vet":
      return <Stethoscope className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "shelter":
      return <Building2 className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "message":
      return <MessagesSquare className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "market":
    case "package":
      return <Package className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "health":
      return <HeartPulse className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "forum":
      return <MessagesSquare className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "star":
      return <Star className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "system":
      return <Sparkles className={cn} size={20} strokeWidth={2} aria-hidden />;
    case "friend":
      return <UserPlus className={cn} size={20} strokeWidth={2} aria-hidden />;
    default:
      return <Bell className={cn} size={20} strokeWidth={2} aria-hidden />;
  }
}
