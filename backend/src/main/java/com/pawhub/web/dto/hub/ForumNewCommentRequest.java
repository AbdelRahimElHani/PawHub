package com.pawhub.web.dto.hub;

import jakarta.validation.constraints.NotBlank;

public record ForumNewCommentRequest(Long parentId, @NotBlank String body) {}
