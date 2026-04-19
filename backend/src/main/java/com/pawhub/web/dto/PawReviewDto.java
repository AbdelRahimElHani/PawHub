package com.pawhub.web.dto;

public record PawReviewDto(
        Long id,
        Long orderId,
        Long reviewerUserId,
        String reviewerDisplayName,
        String reviewerAvatarUrl,
        Long targetUserId,
        int rating,
        String comment,
        String createdAt) {}
