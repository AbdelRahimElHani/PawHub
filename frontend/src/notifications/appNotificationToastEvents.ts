import type { AppNotificationDto } from "../store/useNotificationStore";

export const APP_NOTIFICATION_TOAST_EVENT = "pawhub:app-notification-toast";

export type AppNotificationToastEvent = CustomEvent<AppNotificationDto>;

export function emitAppNotificationToast(notification: AppNotificationDto) {
  window.dispatchEvent(
    new CustomEvent<AppNotificationDto>(APP_NOTIFICATION_TOAST_EVENT, {
      detail: notification,
    }),
  );
}
