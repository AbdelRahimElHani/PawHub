package com.pawhub.web.dto;

import jakarta.validation.constraints.Size;

/**
 * Send text, an attachment reference (after uploading via message-media), or both. At least one of body or
 * attachmentUrl must be non-blank — enforced in service.
 */
public record AppendPawvetTriageMessageRequest(
        @Size(max = 8000) String body,
        @Size(max = 2048) String attachmentUrl,
        @Size(max = 16) String attachmentKind) {}
