package com.pawhub.web.dto;

public record FriendDirectoryUserDto(
        long userId,
        String displayName,
        String avatarUrl,
        String profileCity,
        String profileRegion,
        String accountType) {}
