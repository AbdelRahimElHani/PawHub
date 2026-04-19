package com.pawhub.domain;

public enum ThreadType {
    MATCH,
    LISTING,
    ADOPTION,
    /** User-to-user message thread (no listing / match row required). */
    DIRECT
}
