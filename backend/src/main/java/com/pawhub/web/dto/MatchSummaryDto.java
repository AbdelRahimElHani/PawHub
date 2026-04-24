package com.pawhub.web.dto;

public record MatchSummaryDto(
        Long matchId,
        Long threadId,
        Long myCatId,
        String catAName,
        String catBName,
        String otherOwnerName,
        Long otherOwnerUserId) {}
