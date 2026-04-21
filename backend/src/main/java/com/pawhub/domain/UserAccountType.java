package com.pawhub.domain;

/**
 * Why someone is joining PawHub. Distinct from {@link UserRole} (permissions: USER vs ADMIN).
 */
public enum UserAccountType {
    /** Browsing adoption, may inquire; optional cats later */
    ADOPTER,
    /** Primary focus: cat profiles, PawMatch, PawMarket */
    CAT_OWNER,
    /** Organization listing pets for adoption — creates pending {@link Shelter} until admin approves */
    SHELTER,
    /** Licensed veterinarian — creates pending {@link VetLicenseApplication} until admin approves */
    VET
}
