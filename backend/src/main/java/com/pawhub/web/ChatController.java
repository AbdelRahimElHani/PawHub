package com.pawhub.web;

import com.pawhub.service.ChatService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.MessageDto;
import com.pawhub.web.dto.SendMessageRequest;
import com.pawhub.web.dto.ThreadSummaryDto;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/threads")
    public List<ThreadSummaryDto> threads(@AuthenticationPrincipal SecurityUser user) {
        return chatService.listThreads(user);
    }

    @GetMapping("/threads/{threadId}/messages")
    public Page<MessageDto> messages(
            @PathVariable Long threadId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal SecurityUser user) {
        return chatService.messages(threadId, page, size, user);
    }

    @PostMapping("/threads/{threadId}/messages")
    public MessageDto sendRest(
            @PathVariable Long threadId,
            @Valid @RequestBody SendMessageRequest body,
            @AuthenticationPrincipal SecurityUser user) {
        return chatService.sendMessage(threadId, body.body(), user.getId());
    }
}
