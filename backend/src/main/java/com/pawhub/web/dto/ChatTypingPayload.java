package com.pawhub.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** STOMP /app/chat.typing from client. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ChatTypingPayload(Long threadId, Boolean typing) {}
