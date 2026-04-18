package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShelterUpsertRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 255) String city,
        @Size(max = 255) String region,
        @Size(max = 64) String phone,
        @Size(max = 255) String emailContact,
        @Size(max = 4000) String bio) {}
