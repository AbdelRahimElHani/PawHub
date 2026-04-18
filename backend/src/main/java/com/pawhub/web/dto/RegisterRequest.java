package com.pawhub.web.dto;

import com.pawhub.domain.UserAccountType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6, max = 100) String password,
        @NotBlank @Size(max = 120) String displayName,
        @NotNull UserAccountType accountType,
        @Size(max = 255) String profileCity,
        @Size(max = 255) String profileRegion,
        @Size(max = 4000) String profileBio,
        /* SHELTER account — required in service when accountType is SHELTER */
        @Size(max = 255) String shelterOrgName,
        @Size(max = 255) String shelterCity,
        @Size(max = 255) String shelterRegion,
        @Size(max = 64) String shelterPhone,
        @Size(max = 255) String shelterEmailContact,
        @Size(max = 4000) String shelterBio) {}
