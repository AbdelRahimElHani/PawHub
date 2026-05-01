package com.pawhub.web.dto;

/** Broadcast on /topic/pawvet.triage.{caseId}.typing */
public record PawvetTriageTypingEvent(long userId, String displayName, boolean typing) {}
