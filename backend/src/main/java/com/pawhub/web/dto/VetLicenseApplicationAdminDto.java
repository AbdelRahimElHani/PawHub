package com.pawhub.web.dto;

import java.time.Instant;
import java.util.List;

public record VetLicenseApplicationAdminDto(
        Long id,
        Long userId,
        String email,
        String displayName,
        String licenseNumber,
        String university,
        Integer yearsExperience,
        String phone,
        String professionalBio,
        String status,
        String rejectionReason,
        Instant createdAt,
        List<String> supportingDocumentUrls) {}
