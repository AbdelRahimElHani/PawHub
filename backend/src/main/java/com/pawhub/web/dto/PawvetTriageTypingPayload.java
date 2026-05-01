package com.pawhub.web.dto;

/** STOMP /app/pawvet.triage.typing from client. */
public record PawvetTriageTypingPayload(Long caseId, Boolean typing) {}
