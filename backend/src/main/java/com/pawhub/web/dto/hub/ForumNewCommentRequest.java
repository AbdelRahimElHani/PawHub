package com.pawhub.web.dto.hub;

import jakarta.validation.constraints.Size;

public record ForumNewCommentRequest(Long parentId, @Size(max = 16000) String body, @Size(max = 2048) String attachmentUrl) {}
