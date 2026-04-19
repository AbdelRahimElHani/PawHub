package com.pawhub.web.dto.hub;

public record HubEditorialLinkDto(
        String id,
        String title,
        String url,
        String topicId,
        String sourceLabel,
        String dek,
        String imageUrl,
        boolean featured,
        int sortOrder) {}
