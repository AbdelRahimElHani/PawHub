package com.pawhub.web.dto;

import java.util.List;

public record PawListingDto(
        Long id,
        Long sellerUserId,
        String sellerDisplayName,
        String sellerAvatarUrl,
        boolean sellerVerifiedMeow,
        int sellerCompletedSales,
        String title,
        String description,
        long priceCents,
        boolean isFree,
        String category,
        String city,
        String region,
        String country,
        String cityText,
        Double latitude,
        Double longitude,
        String pawStatus,
        List<String> imageUrls,
        String photoUrl,
        double averageRating,
        long reviewCount,
        String createdAt,
        int stockQuantity,
        long soldQuantity,
        String expiresAt) {}
