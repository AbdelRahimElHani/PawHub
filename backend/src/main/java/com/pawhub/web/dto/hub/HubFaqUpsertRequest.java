package com.pawhub.web.dto.hub;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HubFaqUpsertRequest(
        String id,
        @NotBlank @Size(max = 64) String categoryId,
        @NotBlank String question,
        @NotBlank String answer,
        boolean healthRelated,
        int sortOrder) {}
