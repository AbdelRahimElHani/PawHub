package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record MarketListingUpsertRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 8000) String description,
        @NotNull @PositiveOrZero Long priceCents,
        @Size(max = 255) String city,
        @Size(max = 255) String region,
        Long catId) {}
