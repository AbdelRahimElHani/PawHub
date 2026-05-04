package com.pawhub.web.dto;

import java.util.List;

public record VetAccountReviewsAdminDto(
        Long vetUserId,
        String displayName,
        String email,
        String vetVerificationStatus,
        /** True when credentials were rejected due to admin revoke (distinct from queue decline). */
        boolean verificationRevokedByAdmin,
        double averageStars,
        long reviewCount,
        List<PawVetConsultationReviewDto> reviews) {}
