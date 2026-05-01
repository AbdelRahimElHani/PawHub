package com.pawhub.domain;

/**
 * Why someone is joining PawHub. Distinct from {@link UserRole} (permissions: USER vs ADMIN).
 */
public enum UserAccountType {
    /**
     * Standard member: cat profiles, PawMatch, PawMarket, adoption browsing, and messaging — one account type for
     * former "adopter" and "cat owner" paths.
     */
    MEMBER,
    /** Organization listing pets for adoption — creates pending {@link Shelter} until admin approves */
    SHELTER,
    /** Licensed veterinarian — creates pending {@link VetLicenseApplication} until admin approves */
    VET
}
