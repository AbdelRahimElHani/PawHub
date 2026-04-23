package com.pawhub.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * If Spring Security or SockJS rejects a {@code /ws} request before the global CORS machinery sets headers, the
 * browser only sees a generic CORS failure. Echo {@code Access-Control-Allow-Origin} when the request {@code Origin}
 * matches our configured patterns and the response is an error without CORS yet.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 100)
@RequiredArgsConstructor
public class WsHandshakeCorsResponseFilter extends OncePerRequestFilter {

    private final PawhubProperties pawhubProperties;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri == null || !(uri.equals("/ws") || uri.startsWith("/ws/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        filterChain.doFilter(request, response);
        if (response.isCommitted()) {
            return;
        }
        int status = response.getStatus();
        if (status != HttpServletResponse.SC_UNAUTHORIZED && status != HttpServletResponse.SC_FORBIDDEN) {
            return;
        }
        if (response.containsHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN)) {
            return;
        }
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (origin == null || origin.isBlank()) {
            return;
        }
        CorsConfiguration probe = new CorsConfiguration();
        probe.setAllowedOriginPatterns(CorsOriginPatterns.forPawhub(pawhubProperties));
        String allowOrigin = probe.checkOrigin(origin);
        if (allowOrigin == null) {
            return;
        }
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, allowOrigin);
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
        response.addHeader(HttpHeaders.VARY, HttpHeaders.ORIGIN);
    }
}
