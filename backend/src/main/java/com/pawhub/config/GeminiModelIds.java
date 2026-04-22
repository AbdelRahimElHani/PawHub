package com.pawhub.config;

/**
 * Single source of truth for Google AI {@code generateContent} model IDs. Change here only unless you
 * override via {@code pawhub.gemini.model} in application-secrets / env.
 */
public final class GeminiModelIds {

    private GeminiModelIds() {}

    /** Primary model: vision (cat profile), Cat-Check, and default Whisker chat. */
    public static final String DEFAULT = "gemini-3-flash";

    /** Retry model on HTTP 429 (separate quota in AI Studio). */
    public static final String FALLBACK_ON_429 = "gemini-3.1-flash-lite";

    /** PawBot / Whisker streaming — same as {@link #DEFAULT} unless {@code whisker-model} is set in yaml. */
    public static final String WHISKER = DEFAULT;
}
