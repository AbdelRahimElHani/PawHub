package com.pawhub.web.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 120) String displayName,
        @Size(max = 255) String profileCity,
        @Size(max = 255) String profileRegion,
        @Size(max = 4000) String profileBio) {}
