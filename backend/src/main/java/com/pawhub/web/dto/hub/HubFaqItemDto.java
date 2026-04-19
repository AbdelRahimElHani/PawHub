package com.pawhub.web.dto.hub;

public record HubFaqItemDto(
        String id, String categoryId, String question, String answer, boolean healthRelated, int sortOrder) {}
