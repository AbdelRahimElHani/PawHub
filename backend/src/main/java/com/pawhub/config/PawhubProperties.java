package com.pawhub.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "pawhub")
public class PawhubProperties {

    private final Jwt jwt = new Jwt();
    private String uploadDir = "./uploads";
    private String publicBaseUrl = "http://localhost:8080";

    /**
     * SPA origin for deep links in chat (e.g. listing page). Used in automated messages after buy / message seller.
     */
    private String frontendBaseUrl = "http://localhost:5173";

    /** Absolute URL to the Paw Market listing page (trailing slashes on base are stripped). */
    public String listingPageUrl(long listingId) {
        String base = frontendBaseUrl == null || frontendBaseUrl.isBlank() ? "http://localhost:5173" : frontendBaseUrl.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/market/" + listingId;
    }

    private final Gemini gemini = new Gemini();

    @Getter
    @Setter
    public static class Jwt {
        private String secret = "change-me";
        private long expirationMs = 86400000L;
    }

    @Getter
    @Setter
    public static class Gemini {
        private String apiKey = "";
        private boolean enabled = false;
        /** REST model id for generateContent (see AI Studio rate limits; avoid models with 0/0 quota). */
        private String model = "gemini-2.5-flash";
        /**
         * If set, one retry uses this model when the primary returns HTTP 429 (quota / rate limit).
         * Pick a model that still has quota for your API key (see Google AI Studio).
         */
        private String fallbackModel = "";
        /**
         * If true, transport/API failures (bad key, wrong model id, timeouts) allow the listing
         * instead of hard-rejecting. Set false in production once Gemini is verified working.
         */
        private boolean failOpenOnApiError = true;
    }
}
