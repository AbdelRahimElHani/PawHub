package com.pawhub.web.dto;

import java.util.List;

public record VetAccountReviewsAdminDto(
        Long vetUserId,
        String displayName,
        String email,
        String vetVerificationStatus,
        double averageStars,
        long reviewCount,
        List<PawVetConsultationReviewDto> reviews) {}
