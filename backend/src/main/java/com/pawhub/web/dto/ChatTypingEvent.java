package com.pawhub.web.dto;

public record ChatTypingEvent(Long userId, String displayName, boolean typing) {}
