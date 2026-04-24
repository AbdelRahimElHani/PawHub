package com.pawhub.domain;

/** Stored on {@link AppNotification}; drives UI icon + analytics. */
public enum AppNotificationKind {
    /** Admin queue: new or updated shelter registration (not yet dossier-complete). */
    ADMIN_SHELTER_REGISTERED,
    /** Admin queue: shelter marked profile complete and ready for verification. */
    ADMIN_SHELTER_DOSSIER_SUBMITTED,
    /** Admin queue: new veterinarian license application. */
    ADMIN_VET_LICENSE_SUBMITTED,
    SHELTER_VERIFIED,
    ADOPTION_INQUIRY,
    NEW_MESSAGE,
    /** Non-friend sent a direct message request (first message in a gated thread). */
    MESSAGE_REQUEST_RECEIVED,
    VET_LICENSE_VERIFIED,
    VET_NEW_REVIEW,
    MARKET_ORDER_BUYER,
    MARKET_ORDER_SELLER,
    /** Paw Market listing removed by an administrator. */
    MARKET_LISTING_REMOVED_ADMIN,
    /** Shelter’s adoption listing is live on PawHub. */
    ADOPTION_LISTING_PUBLISHED,
    /** Guardian’s inquiry was delivered to the shelter (confirmation). */
    ADOPTION_INQUIRY_SUBMITTED,
    /** Shelter application was not approved. */
    SHELTER_APPLICATION_REJECTED,
    /** New PawVet triage case open for claim (notified to approved veterinarians). */
    PAWVET_NEW_TRIAGE_CASE,
    FORUM_REPLY,
    /** Someone replied directly to your forum comment. */
    FORUM_COMMENT_REPLY,
    FORUM_SCORE_MILESTONE,
    SYSTEM_ANNOUNCEMENT,
    HEALTH_REMINDER,
    /** Another user sent you a friend request. */
    FRIEND_REQUEST_RECEIVED,
    /** Your outgoing friend request was recorded (confirmation for sender). */
    FRIEND_REQUEST_SENT,
    /** A pending friend request was accepted (you are now friends). */
    FRIEND_REQUEST_ACCEPTED
}
