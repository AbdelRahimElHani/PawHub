package com.pawhub.web.dto;

import jakarta.annotation.Nullable;

/** Active market order in a listing thread (if any), plus flags for the viewer. */
public record PawMarketOrderThreadDto(
        @Nullable Long orderId,
        @Nullable Long listingId,
        @Nullable String listingTitle,
        int quantity,
        @Nullable String sellerStatus,
        boolean viewerIsBuyer,
        boolean viewerIsSeller,
        boolean buyerCanReview) {}
