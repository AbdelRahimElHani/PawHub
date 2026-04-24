package com.pawhub.web.dto;

/** Pushed over STOMP {@code /user/queue/pawhub-app-notifications} so clients refresh the bell/drawer. */
public record AppNotificationPushPayload(String type) {}
