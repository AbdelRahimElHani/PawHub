package com.pawhub.web;

import com.pawhub.security.SecurityUser;
import com.pawhub.service.ChatService;
import com.pawhub.web.dto.ChatSendPayload;
import com.pawhub.web.dto.ChatTypingPayload;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatStompController {

    private final ChatService chatService;

    @MessageMapping("/chat.send")
    public void send(@Payload ChatSendPayload payload, Principal principal) {
        if (!(principal instanceof SecurityUser user)) {
            return;
        }
        chatService.sendMessage(payload.threadId(), payload.body(), user.getId());
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload ChatTypingPayload payload, Principal principal) {
        if (!(principal instanceof SecurityUser user)) {
            return;
        }
        if (payload == null || payload.threadId() == null) {
            return;
        }
        boolean on = Boolean.TRUE.equals(payload.typing());
        String name = user.getUser().getDisplayName() != null ? user.getUser().getDisplayName() : user.getUser().getEmail();
        chatService.broadcastTyping(payload.threadId(), user.getId(), name, on);
    }
}
