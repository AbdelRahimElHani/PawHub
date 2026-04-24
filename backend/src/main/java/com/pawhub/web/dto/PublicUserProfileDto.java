package com.pawhub.web.dto;

public record PublicUserProfileDto(
        long userId,
        String displayName,
        String avatarUrl,
        String profileCity,
        String profileRegion,
        String profileBio,
        String accountType,
        PublicProfileRelationship relationship) {}
