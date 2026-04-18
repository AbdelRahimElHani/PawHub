package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CatUpsertRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 255) String breed,
        Integer ageMonths,
        @Size(max = 4000) String bio) {}
