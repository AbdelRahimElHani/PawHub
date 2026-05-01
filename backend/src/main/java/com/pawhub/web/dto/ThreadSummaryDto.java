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
        boolean unread,
        boolean messageRequestIncoming,
        boolean messageRequestOutgoing,
        boolean messageRequestDeclined,
        /** When true, the composer should stay disabled until the gate clears (accept request or become friends). */
        boolean directMessagingLocked,
        /** Set when type is {@code ADOPTION} — links to the listing. */
        Long adoptionListingId,
        /** PENDING, CONFIRMED, or DECLINED. */
        String adoptionInquiryOutcome,
        /** ACTIVE, SOLD, or ARCHIVED for the linked listing. */
        String adoptionListingStatus,
        /** True when the current user owns the shelter for this thread. */
        boolean adoptionImShelter) {}
