package com.pawhub.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * When the API still thinks its public base is {@code localhost} but Railway has assigned a
 * {@code RAILWAY_PUBLIC_DOMAIN}, set {@link PawhubProperties#setPublicBaseUrl} to {@code
 * https://&lt;domain&gt;} so new uploads return correct {@code /api/files/...} URLs.
 *
 * <p>Override any time with {@code PAWHUB_PUBLIC_BASE_URL} in the host environment.
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class PublicBaseUrlFromRailwayRunner implements ApplicationRunner {

    private final PawhubProperties pawhubProperties;

    @Override
    public void run(ApplicationArguments args) {
        String domain = System.getenv("RAILWAY_PUBLIC_DOMAIN");
        if (!StringUtils.hasText(domain)) {
            return;
        }
        domain = domain.trim();
        if (domain.isEmpty() || domain.toLowerCase().startsWith("localhost")) {
            return;
        }
        domain = domain.replaceFirst("^https?://", "");
        while (domain.endsWith("/")) {
            domain = domain.substring(0, domain.length() - 1);
        }
        if (domain.isEmpty()) {
            return;
        }

        String base = pawhubProperties.getPublicBaseUrl();
        if (base == null) {
            base = "";
        }
        base = base.trim();
        boolean stillLocal =
                base.isEmpty()
                        || base.contains("://localhost")
                        || base.contains("://127.0.0.1");
        if (!stillLocal) {
            return;
        }

        String fixed = "https://" + domain;
        pawhubProperties.setPublicBaseUrl(fixed);
        log.info("pawhub.public-base-url was localhost or empty — set to {} (from RAILWAY_PUBLIC_DOMAIN). Set PAWHUB_PUBLIC_BASE_URL to override.", fixed);
    }
}
