package com.pawhub.config;

import static com.pawhub.config.GeminiModelIds.DEFAULT;
import static com.pawhub.config.GeminiModelIds.FALLBACK_ON_429;
import static com.pawhub.config.GeminiModelIds.WHISKER;

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

    private final Mail mail = new Mail();

    private final Admin admin = new Admin();

    private final DemoUser demoUser = new DemoUser();

    private final Auth auth = new Auth();

    @Getter
    @Setter
    public static class Auth {
        /**
         * When true, new registrations are verified immediately (no email step). Use false in production with SMTP.
         * Override in application.yml for local dev (see pawhub.auth.auto-verify-email-on-registration).
         */
        private boolean autoVerifyEmailOnRegistration = false;
    }

    @Getter
    @Setter
    public static class Mail {
        /** From address when SMTP is configured (spring.mail.host). */
        private String from = "noreply@localhost";

        private String fromName = "PawHub";
    }

    @Getter
    @Setter
    public static class Admin {
        /**
         * Default dev admin; change in production and disable {@link #syncCredentialsOnStartup}.
         */
        private String email = "admin@pawhub.local";

        private String password = "admin123";

        /**
         * When true, on each startup the user with {@link #email} gets this password (re-hashed) and role ADMIN.
         * Stops "invalid credentials" if that email was registered earlier with a different password.
         * Set false in production once the admin password is set.
         */
        private boolean syncCredentialsOnStartup = true;
    }

    @Getter
    @Setter
    public static class DemoUser {
        /**
         * When true, ensure a regular (non-admin) user exists for local dev. Set false in production.
         */
        private boolean enabled = true;

        private String email = "demo@pawhub.local";

        private String password = "PawHub2026!";

        private String displayName = "Demo User";
    }

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
        /** Defaults to {@link GeminiModelIds#DEFAULT}; override in yaml if needed. */
        private String model = DEFAULT;
        /** Defaults to {@link GeminiModelIds#FALLBACK_ON_429} for 429 retries. */
        private String fallbackModel = FALLBACK_ON_429;
        /**
         * If true, transport/API failures (bad key, wrong model id, timeouts) allow the listing
         * instead of hard-rejecting. Set false in production once Gemini is verified working.
         */
        private boolean failOpenOnApiError = true;

        /** Defaults to {@link GeminiModelIds#WHISKER}; falls back to {@link #model} if blank. */
        private String whiskerModel = WHISKER;
    }
}
