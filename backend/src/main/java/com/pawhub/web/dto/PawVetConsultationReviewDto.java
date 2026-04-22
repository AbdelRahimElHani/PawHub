package com.pawhub.web.dto;

public record PawVetConsultationReviewDto(
        Long id,
        String externalCaseId,
        Long vetUserId,
        Long ownerUserId,
        String ownerDisplayName,
        int stars,
        String comment,
        String createdAt) {}
