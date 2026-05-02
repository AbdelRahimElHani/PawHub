package com.pawhub.web.dto;

/** Buyer-facing reminder to leave a seller review after a confirmed Paw Market order. */
public record PawMarketReviewPromptDto(
        long orderId,
        long listingId,
        String listingTitle,
        long sellerUserId,
        String sellerDisplayName,
        long threadId) {}
