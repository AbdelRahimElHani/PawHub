package com.pawhub.web.dto;

public record MatchSummaryDto(Long matchId, Long threadId, String catAName, String catBName, String otherOwnerName) {}
