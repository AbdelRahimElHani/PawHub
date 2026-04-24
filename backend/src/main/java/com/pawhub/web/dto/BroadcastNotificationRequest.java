package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BroadcastNotificationRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 4000) String body,
        @NotBlank @Size(max = 512) String deepLink) {}
