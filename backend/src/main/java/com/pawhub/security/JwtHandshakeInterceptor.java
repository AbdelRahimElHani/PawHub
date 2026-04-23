package com.pawhub.security;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return true;
        }
        String token = extractAccessToken(servletRequest);
        if (token != null && !token.isBlank()) {
            try {
                attributes.put("userId", jwtService.parseUserId(token));
            } catch (Exception ignored) {
                // SockJS may open the transport before a query token is visible; STOMP CONNECT must still authenticate.
            }
        }
        // Never block the HTTP upgrade / SockJS transport here — auth is enforced on STOMP CONNECT.
        return true;
    }

    private static String extractAccessToken(ServletServerHttpRequest servletRequest) {
        var req = servletRequest.getServletRequest();
        String q = req.getParameter("access_token");
        if (q != null && !q.isBlank()) {
            return q.trim();
        }
        String auth = req.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth != null && auth.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return auth.substring(7).trim();
        }
        return null;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {}
}
