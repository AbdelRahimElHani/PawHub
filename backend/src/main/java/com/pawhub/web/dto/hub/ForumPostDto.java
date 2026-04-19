package com.pawhub.web.dto.hub;

public record ForumPostDto(
        long id,
        String roomSlug,
        long authorUserId,
        String authorDisplayName,
        String title,
        String body,
        String createdAt,
        int score,
        int commentCount,
        Long helpfulCommentId) {}
