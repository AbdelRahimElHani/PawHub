package com.pawhub.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PawReviewRequest(
        @NotNull Long orderId,
        @NotNull Long targetUserId,
        @Min(1) @Max(5) int rating,
        @Size(max = 4000) String comment) {}
