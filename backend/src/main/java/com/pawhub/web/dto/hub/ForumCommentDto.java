package com.pawhub.web.dto.hub;

import java.util.List;

public record ForumCommentDto(
        long id,
        long postId,
        Long parentId,
        long authorUserId,
        String authorDisplayName,
        String body,
        String createdAt,
        List<ForumCommentDto> children) {}
