package com.pawhub.web.dto.hub;

import jakarta.validation.constraints.Size;

public record ForumCommentEditRequest(@Size(max = 16000) String body) {}
