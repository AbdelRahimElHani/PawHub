package com.pawhub.web.dto.hub;

public record ForumRoomDto(long id, String slug, String title, String description, String icon, Long createdByUserId) {}
