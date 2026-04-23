package com.pawhub.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.util.StringUtils;

/** Shared CORS + SockJS {@code allowedOriginPatterns} (must match across Security, WebMvc, and WebSocket). */
public final class CorsOriginPatterns {

    private CorsOriginPatterns() {}

    public static List<String> forPawhub(PawhubProperties pawhubProperties) {
        if (pawhubProperties.isCorsAllowAllOrigins()) {
            return List.of("*");
        }
        List<String> patterns = new ArrayList<>(
                List.of(
                        "http://localhost:*",
                        "http://127.0.0.1:*",
                        "http://[::1]:*",
                        "https://localhost:*",
                        "https://*.up.railway.app",
                        "https://*.railway.app",
                        "https://*.vercel.app",
                        "https://*.netlify.app"));
        if (StringUtils.hasText(pawhubProperties.getFrontendBaseUrl())) {
            String u = pawhubProperties.getFrontendBaseUrl().trim();
            while (u.endsWith("/")) {
                u = u.substring(0, u.length() - 1);
            }
            if (!u.isEmpty()) {
                patterns.add(u);
            }
        }
        if (StringUtils.hasText(pawhubProperties.getCorsAdditionalAllowedPatterns())) {
            for (String part : pawhubProperties.getCorsAdditionalAllowedPatterns().split(",")) {
                String s = part.trim();
                if (!s.isEmpty()) {
                    patterns.add(s);
                }
            }
        }
        return patterns;
    }
}
