package com.pawhub.web.dto;

import java.time.Instant;

public record ThreadSummaryDto(
        Long id,
        String type,
        Long otherUserId,
        String otherDisplayName,
        String otherAvatarUrl,
        Long marketListingId,
        String lastMessagePreview,
        Instant lastMessageAt,
        boolean unread) {}
