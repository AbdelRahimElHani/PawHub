package com.pawhub.web.dto;

import java.time.Instant;

public record PawvetVetReportAdminDto(
        Long id,
        Long triageCaseId,
        String catName,
        Long vetUserId,
        String vetDisplayName,
        String vetEmail,
        Long reporterUserId,
        String reporterDisplayName,
        String reporterEmail,
        String reason,
        Instant createdAt) {}
