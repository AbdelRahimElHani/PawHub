package com.pawhub.web.dto;

/** Pushed over STOMP {@code /user/queue/pawhub-app-notifications} so clients refresh and toast live rows. */
public record AppNotificationPushPayload(String type, Long notificationId, AppNotificationDto notification) {
    public AppNotificationPushPayload(String type) {
        this(type, null, null);
    }

    public static AppNotificationPushPayload notification(AppNotificationDto notification) {
        return new AppNotificationPushPayload("NOTIFICATION", notification.id(), notification);
    }
}
