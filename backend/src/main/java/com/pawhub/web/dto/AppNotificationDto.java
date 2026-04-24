package com.pawhub.web.dto;

public record AppNotificationDto(
        long id,
        String kind,
        String title,
        String body,
        boolean read,
        String deepLink,
        String iconKind,
        String avatarUrl,
        String createdAt) {}
