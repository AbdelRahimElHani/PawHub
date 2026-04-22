package com.pawhub.config;

/**
 * Single source of truth for Google AI {@code generateContent} model IDs. Change here only unless you
 * override via {@code pawhub.gemini.model} in application-secrets / env.
 *
 * <p>Defaults target strong price/performance (not Pro-tier cost, not Lite-only quality): {@code
 * gemini-2.5-flash} for main traffic; {@code gemini-2.5-flash-lite} on 429 as a cheaper pool with its
 * own rate limits.
 */
public final class GeminiModelIds {

    private GeminiModelIds() {}

    /** Primary: vision (cat profile), Cat-Check, PawBot / Whisker when {@code whisker-model} is unset. */
    public static final String DEFAULT = "gemini-2.5-flash";

    /** HTTP 429 retry — lighter 2.5 tier, often separate quota from {@link #DEFAULT}. */
    public static final String FALLBACK_ON_429 = "gemini-2.5-flash-lite";

    /** PawBot / Whisker streaming — same as {@link #DEFAULT} unless {@code whisker-model} is set in yaml. */
    public static final String WHISKER = DEFAULT;
}
