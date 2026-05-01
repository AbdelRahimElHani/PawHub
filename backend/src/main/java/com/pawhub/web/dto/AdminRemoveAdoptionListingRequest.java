package com.pawhub.web.dto;

import jakarta.validation.constraints.Size;

public record AdminRemoveAdoptionListingRequest(
        @Size(max = 2000) String reason,
        boolean warnShelter,
        boolean banShelter) {

    public static AdminRemoveAdoptionListingRequest defaults() {
        return new AdminRemoveAdoptionListingRequest(null, false, false);
    }
}
