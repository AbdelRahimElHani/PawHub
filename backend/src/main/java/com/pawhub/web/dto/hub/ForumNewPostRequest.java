package com.pawhub.web.dto.hub;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForumNewPostRequest(
        @NotBlank @Size(max = 512) String title, @NotBlank String body) {}
