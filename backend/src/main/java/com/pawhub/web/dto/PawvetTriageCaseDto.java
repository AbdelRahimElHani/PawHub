package com.pawhub.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record PawvetTriageCaseDto(
        long id,
        long ownerUserId,
        String ownerDisplayName,
        String ownerAvatarUrl,
        Long catId,
        String catName,
        Map<String, Object> catSnapshot,
        String symptoms,
        String mediaDescription,
        List<String> attachmentUrls,
        String urgency,
        String status,
        Long vetUserId,
        String vetName,
        String vetAvatarUrl,
        Instant createdAt,
        Instant resolvedAt,
        List<PawvetTriageChatMessageDto> messages,
        String summary) {}
