package com.pawhub.config;

import com.pawhub.repository.UserRepository;
import com.pawhub.security.JwtService;
import com.pawhub.security.SecurityUser;
import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageDeliveryException;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StompUserChannelInterceptor implements ChannelInterceptor {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
            return message;
        }
        Long userId = null;
        Object userIdObj = accessor.getSessionAttributes().get("userId");
        if (userIdObj instanceof Long l) {
            userId = l;
        } else if (userIdObj instanceof Number n) {
            userId = n.longValue();
        }
        if (userId == null) {
            List<String> headers = accessor.getNativeHeader("access_token");
            if (headers != null && !headers.isEmpty()) {
                try {
                    userId = jwtService.parseUserId(headers.get(0));
                } catch (Exception ignored) {
                }
            }
        }
        if (userId == null) {
            List<String> authHeaders = accessor.getNativeHeader("Authorization");
            if (authHeaders != null && !authHeaders.isEmpty()) {
                String val = authHeaders.get(0);
                if (val != null && val.regionMatches(true, 0, "Bearer ", 0, 7)) {
                    try {
                        userId = jwtService.parseUserId(val.substring(7).trim());
                    } catch (Exception ignored) {
                    }
                }
            }
        }
        if (userId != null) {
            var user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                Principal principal = new SecurityUser(user);
                accessor.setUser(principal);
                return message;
            }
        }
        throw new MessageDeliveryException(message, new AccessDeniedException("Missing or invalid access_token on STOMP CONNECT"));
    }
}
