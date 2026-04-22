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
        boolean emailVerified,
        /** PENDING / APPROVED / REJECTED when accountType is VET; otherwise null */
        String vetVerificationStatus,
        /** Populated when vet verification was rejected */
        String vetRejectionReason) {}
