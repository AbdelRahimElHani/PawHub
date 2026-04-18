package com.pawhub.web.dto;

public record MarketListingDto(
        Long id,
        Long sellerUserId,
        Long catId,
        String title,
        String description,
        long priceCents,
        String city,
        String region,
        String status,
        String photoUrl,
        String sellerDisplayName) {}
