package com.pawhub.config;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.util.StringUtils;

/** Shared CORS + SockJS {@code allowedOriginPatterns} (must match across Security, WebMvc, and WebSocket). */
public final class CorsOriginPatterns {

    private CorsOriginPatterns() {}

    /**
     * Never use the literal pattern {@code "*"} here: with {@code Access-Control-Allow-Credentials: true} (or
     * SockJS credentialed transports) the browser rejects {@code Access-Control-Allow-Origin: *}. Use broad patterns
     * like {@code https://*} so Spring echoes the request {@code Origin}.
     */
    public static List<String> forPawhub(PawhubProperties pawhubProperties) {
        Set<String> patterns = new LinkedHashSet<>(
                List.of(
                        "http://localhost:*",
                        "http://127.0.0.1:*",
                        "http://[::1]:*",
                        "https://localhost:*",
                        "https://*.up.railway.app",
                        "https://*.railway.app",
                        "https://*.vercel.app",
                        "https://*.netlify.app"));
        if (pawhubProperties.isCorsAllowAllOrigins()) {
            patterns.add("http://*");
            patterns.add("https://*");
        }
        if (StringUtils.hasText(pawhubProperties.getFrontendBaseUrl())) {
            String u = pawhubProperties.getFrontendBaseUrl().trim();
            while (u.endsWith("/")) {
                u = u.substring(0, u.length() - 1);
            }
            if (!u.isEmpty() && !"*".equals(u)) {
                patterns.add(u);
            }
        }
        if (StringUtils.hasText(pawhubProperties.getCorsAdditionalAllowedPatterns())) {
            for (String part : pawhubProperties.getCorsAdditionalAllowedPatterns().split(",")) {
                String s = part.trim();
                if (!s.isEmpty() && !"*".equals(s)) {
                    patterns.add(s);
                }
            }
        }
        patterns.remove("*");
        return new ArrayList<>(patterns);
    }
}
