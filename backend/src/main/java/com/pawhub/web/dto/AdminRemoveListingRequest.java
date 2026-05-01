package com.pawhub.web.dto;

import jakarta.validation.constraints.Size;

public record AdminRemoveListingRequest(
        @Size(max = 2000) String reason,
        boolean warnSeller,
        boolean banSeller) {

    public static AdminRemoveListingRequest defaults() {
        return new AdminRemoveListingRequest(null, false, false);
    }
}
