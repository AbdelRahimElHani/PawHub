package com.pawhub.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record PawListingUpsertRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 8000) String description,
        @PositiveOrZero long priceCents,
        boolean isFree,
        String category,
        String city,
        String region,
        String cityText,
        Double latitude,
        Double longitude,
        /** Remaining units for sale; omit or null to keep unchanged on update, default 1 on create. */
        @Min(1) @Max(99999) Integer stockQuantity) {}
