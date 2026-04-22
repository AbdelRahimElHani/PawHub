package com.pawhub.web.dto;

public record AuthResponse(
        String token,
        Long userId,
        String email,
        String displayName,
        String role,
        String accountType,
        String avatarUrl,
        String profileCity,
        String profileRegion,
        String profileBio,
        boolean emailVerified) {}
