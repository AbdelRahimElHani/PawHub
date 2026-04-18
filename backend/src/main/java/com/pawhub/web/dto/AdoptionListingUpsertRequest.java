package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdoptionListingUpsertRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 255) String petName,
        @Size(max = 8000) String description,
        @Size(max = 255) String breed,
        Integer ageMonths) {}
