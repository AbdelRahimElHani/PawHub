package com.pawhub.web.dto.hub;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HubEditorialUpsertRequest(
        String id,
        @NotBlank @Size(max = 512) String title,
        @NotBlank String url,
        @NotBlank String topicId,
        String sourceLabel,
        String dek,
        String imageUrl,
        boolean featured,
        int sortOrder) {}
