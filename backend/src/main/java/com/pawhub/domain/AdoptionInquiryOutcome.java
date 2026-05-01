package com.pawhub.domain;

/** Resolves a shelter–adopter conversation about a specific listing. */
public enum AdoptionInquiryOutcome {
    PENDING,
    /** Shelter confirmed: this adopter adopted the pet; listing becomes {@link ListingStatus#SOLD}. */
    CONFIRMED,
    /** Shelter indicated the adoption is not going ahead with this person (listing may stay open). */
    DECLINED
}
