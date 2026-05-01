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
        String vetRejectionReason,
        /** Database id of vet license application when accountType is VET */
        Long vetApplicationId,
        /** PENDING / REJECTED_FINAL when accountType is VET; otherwise null */
        String vetAppealState,
        /** True when the user cannot buy or sell on Paw Market. */
        boolean pawMarketBanned,
        /** True when a shelter account cannot publish or manage Paw Adopt listings. */
        boolean pawAdoptBanned) {}
