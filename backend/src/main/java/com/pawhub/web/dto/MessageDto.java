package com.pawhub.web.dto;

import java.time.Instant;

public record MessageDto(
        Long id, Long senderId, String body, Instant createdAt, String attachmentUrl) {}
