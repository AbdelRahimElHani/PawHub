package com.pawhub.service;

import com.pawhub.domain.ChatThread;
import com.pawhub.domain.Message;
import com.pawhub.domain.ThreadType;
import com.pawhub.domain.User;
import com.pawhub.repository.ChatThreadRepository;
import com.pawhub.repository.MessageRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.ChatInboxEvent;
import com.pawhub.web.dto.ChatTypingEvent;
import com.pawhub.web.dto.MessageDto;
import com.pawhub.web.dto.ThreadIdResponse;
import com.pawhub.web.dto.ThreadSummaryDto;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatThreadRepository chatThreadRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<ThreadSummaryDto> listThreads(SecurityUser principal) {
        return chatThreadRepository.findForUser(principal.getId()).stream()
                .map(t -> toSummary(t, principal.getId()))
                .sorted(Comparator.comparing(
                                ThreadSummaryDto::lastMessageAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed())
                .toList();
    }

    @Transactional
    public Page<MessageDto> messages(Long threadId, int page, int size, SecurityUser principal) {
        ChatThread t = chatThreadRepository.findById(threadId).orElseThrow();
        assertParticipant(t, principal.getId());
        markThreadRead(t, principal.getId());
        return messageRepository
                .findByThreadIdOrderByCreatedAtDesc(threadId, PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(ChatService::toMessageDto);
    }

    /** Text-only (STOMP or JSON). */
    @Transactional
    public MessageDto sendMessage(Long threadId, String body, Long senderId) {
        String text = body == null ? "" : body.trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("Message text cannot be empty.");
        }
        return saveMessage(threadId, senderId, text, null);
    }

    /** REST: optional caption + optional image (at least one required). */
    @Transactional
    public MessageDto sendMessageWithOptionalAttachment(
            Long threadId, String body, MultipartFile file, Long senderId) throws Exception {

        String text = body == null ? "" : body.trim();
        boolean hasFile = file != null && !file.isEmpty();
        if (text.isEmpty() && !hasFile) {
            throw new IllegalArgumentException("Send a message or attach an image.");
        }

        String attachmentUrl = null;
        if (hasFile) {
            attachmentUrl = fileStorageService.store(file, "chat");
        }

        return saveMessage(threadId, senderId, text, attachmentUrl);
    }

    @Transactional
    public ThreadIdResponse openOrCreateDirectThread(Long otherUserId, SecurityUser me) {
        if (otherUserId.equals(me.getId())) {
            throw new IllegalArgumentException("Cannot message yourself.");
        }
        userRepository.findById(otherUserId).orElseThrow(() -> new IllegalArgumentException("User not found."));

        return chatThreadRepository
                .findDirectThread(me.getId(), otherUserId, ThreadType.DIRECT)
                .map(t -> new ThreadIdResponse(t.getId()))
                .orElseGet(() -> {
                    User meUser = userRepository.getReferenceById(me.getId());
                    User other = userRepository.getReferenceById(otherUserId);
                    User p1 = meUser.getId() < other.getId() ? meUser : other;
                    User p2 = meUser.getId() < other.getId() ? other : meUser;
                    ChatThread t = ChatThread.builder()
                            .type(ThreadType.DIRECT)
                            .participantOne(p1)
                            .participantTwo(p2)
                            .build();
                    chatThreadRepository.save(t);
                    return new ThreadIdResponse(t.getId());
                });
    }

    private MessageDto saveMessage(Long threadId, Long senderId, String body, String attachmentUrl) {
        ChatThread t = chatThreadRepository.findById(threadId).orElseThrow();
        assertParticipant(t, senderId);
        User sender = userRepository.getReferenceById(senderId);
        Message msg = Message.builder()
                .thread(t)
                .sender(sender)
                .body(body)
                .attachmentUrl(attachmentUrl)
                .build();
        messageRepository.save(msg);
        MessageDto dto = toMessageDto(msg);
        messagingTemplate.convertAndSend("/topic/threads." + threadId, dto);
        pushInboxToParticipants(t, ChatInboxEvent.message(threadId, dto));
        return dto;
    }

    /** In-app + cross-device: notify both participants' WebSocket sessions (per-user queue). */
    private void pushInboxToParticipants(ChatThread t, ChatInboxEvent event) {
        String a = t.getParticipantOne().getEmail();
        String b = t.getParticipantTwo().getEmail();
        messagingTemplate.convertAndSendToUser(a, "/queue/pawhub-chat", event);
        messagingTemplate.convertAndSendToUser(b, "/queue/pawhub-chat", event);
    }

    /** STOMP: typing indicator; only participants receive via thread-scoped topic. */
    @Transactional(readOnly = true)
    public void broadcastTyping(long threadId, long userId, String displayName, boolean typing) {
        ChatThread t = chatThreadRepository.findById(threadId).orElseThrow();
        assertParticipant(t, userId);
        String name = displayName == null || displayName.isBlank() ? "Someone" : displayName;
        messagingTemplate.convertAndSend(
                "/topic/threads." + threadId + ".typing", new ChatTypingEvent(userId, name, typing));
    }

    public void assertParticipant(ChatThread t, Long userId) {
        long p1 = t.getParticipantOne().getId();
        long p2 = t.getParticipantTwo().getId();
        if (userId != p1 && userId != p2) {
            throw new IllegalArgumentException("Not in this thread");
        }
    }

    private ThreadSummaryDto toSummary(ChatThread t, Long me) {
        User other =
                t.getParticipantOne().getId().equals(me) ? t.getParticipantTwo() : t.getParticipantOne();
        Optional<Message> last = messageRepository.findFirstByThread_IdOrderByCreatedAtDesc(t.getId());
        String preview = last.map(this::previewLine).orElse("");
        Instant lastAt = last.map(Message::getCreatedAt).orElse(null);
        boolean unread = computeUnread(last, me, getReadAt(t, me));
        return new ThreadSummaryDto(
                t.getId(),
                t.getType().name(),
                other.getId(),
                other.getDisplayName(),
                other.getAvatarUrl(),
                t.getMarketListingId(),
                preview,
                lastAt,
                unread);
    }

    private static boolean computeUnread(Optional<Message> lastOpt, Long me, Instant myReadAt) {
        if (lastOpt.isEmpty()) {
            return false;
        }
        Message last = lastOpt.get();
        if (last.getSender().getId().equals(me)) {
            return false;
        }
        if (myReadAt == null) {
            return true;
        }
        return last.getCreatedAt().isAfter(myReadAt);
    }

    private static Instant getReadAt(ChatThread t, Long me) {
        if (t.getParticipantOne().getId().equals(me)) {
            return t.getParticipantOneLastReadAt();
        }
        if (t.getParticipantTwo().getId().equals(me)) {
            return t.getParticipantTwoLastReadAt();
        }
        return null;
    }

    private void markThreadRead(ChatThread t, Long me) {
        Instant now = Instant.now();
        if (t.getParticipantOne().getId().equals(me)) {
            t.setParticipantOneLastReadAt(now);
        } else if (t.getParticipantTwo().getId().equals(me)) {
            t.setParticipantTwoLastReadAt(now);
        }
        chatThreadRepository.save(t);
    }

    private String previewLine(Message m) {
        boolean hasImg = m.getAttachmentUrl() != null && !m.getAttachmentUrl().isBlank();
        String b = m.getBody() == null ? "" : m.getBody().trim();
        if (hasImg && b.isEmpty()) {
            return "[Photo]";
        }
        if (hasImg && !b.isEmpty()) {
            return b.length() > 60 ? b.substring(0, 57) + "…" : b;
        }
        if (b.isEmpty()) {
            return "";
        }
        return b.length() > 80 ? b.substring(0, 77) + "…" : b;
    }

    private static MessageDto toMessageDto(Message m) {
        return new MessageDto(
                m.getId(),
                m.getSender().getId(),
                m.getBody(),
                m.getCreatedAt(),
                m.getAttachmentUrl());
    }
}
