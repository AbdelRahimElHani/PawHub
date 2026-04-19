package com.pawhub.web;

import com.pawhub.service.ChatService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.MessageDto;
import com.pawhub.web.dto.SendMessageRequest;
import com.pawhub.web.dto.ThreadIdResponse;
import com.pawhub.web.dto.ThreadSummaryDto;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/threads")
    public List<ThreadSummaryDto> threads(@AuthenticationPrincipal SecurityUser user) {
        return chatService.listThreads(user);
    }

    /** Open or resume a 1:1 direct thread with another user (LinkedIn-style DM). */
    @PostMapping("/dm/{userId}")
    public ThreadIdResponse openDirect(
            @PathVariable Long userId, @AuthenticationPrincipal SecurityUser user) {
        return chatService.openOrCreateDirectThread(userId, user);
    }

    @GetMapping("/threads/{threadId}/messages")
    public Page<MessageDto> messages(
            @PathVariable Long threadId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal SecurityUser user) {
        return chatService.messages(threadId, page, size, user);
    }

    @PostMapping(value = "/threads/{threadId}/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
    public MessageDto sendJson(
            @PathVariable Long threadId,
            @Valid @RequestBody SendMessageRequest body,
            @AuthenticationPrincipal SecurityUser user) {
        return chatService.sendMessage(threadId, body.body(), user.getId());
    }

    @PostMapping(value = "/threads/{threadId}/messages", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MessageDto sendMultipart(
            @PathVariable Long threadId,
            @RequestParam(value = "body", required = false) String body,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal SecurityUser user)
            throws Exception {
        return chatService.sendMessageWithOptionalAttachment(threadId, body, file, user.getId());
    }
}
