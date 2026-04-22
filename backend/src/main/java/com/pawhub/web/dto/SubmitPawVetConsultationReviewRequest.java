package com.pawhub.web.dto;

import jakarta.validation.constraints.*;

public record SubmitPawVetConsultationReviewRequest(
        @NotBlank @Size(max = 80) String externalCaseId,
        @NotNull Long vetUserId,
        @Min(1) @Max(5) int stars,
        @Size(max = 4000) String comment) {}
