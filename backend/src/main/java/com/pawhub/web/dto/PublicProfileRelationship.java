package com.pawhub.web.dto;

/** Viewer's relationship to the profile user. */
public enum PublicProfileRelationship {
    SELF,
    NONE,
    OUTGOING_PENDING,
    INCOMING_PENDING,
    FRIENDS
}
