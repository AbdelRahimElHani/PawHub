package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdoptionListingUpsertRequest(
        @NotBlank @Size(min = 4, max = 255) String title,
        @Size(max = 255) String petName,
        @NotBlank @Size(min = 30, max = 8000) String description,
        @Size(max = 255) String breed,
        Integer ageMonths) {}
