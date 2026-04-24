package com.pawhub.web.dto;

public record DiscoverUserDto(
        long userId,
        String displayName,
        String avatarUrl,
        String profileCity,
        String profileRegion,
        String accountType,
        int score,
        int mutualFriendsCount,
        PublicProfileRelationship relationship) {}
