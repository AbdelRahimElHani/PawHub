package com.pawhub.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PawvetTriageChatMessageDto(
        String id,
        String sender,
        String body,
        String at,
        String attachmentUrl,
        String attachmentKind) {}
