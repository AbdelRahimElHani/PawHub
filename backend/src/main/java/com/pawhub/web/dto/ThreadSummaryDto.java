package com.pawhub.web.dto;

public record ThreadSummaryDto(Long id, String type, Long otherUserId, String otherDisplayName, Long marketListingId) {}
