package com.pawhub.service;

import com.pawhub.domain.AppNotificationKind;
import com.pawhub.domain.ChatThread;
import com.pawhub.domain.DmRequestStatus;
import com.pawhub.domain.FriendshipStatus;
import com.pawhub.domain.Message;
import com.pawhub.domain.ThreadType;
import com.pawhub.domain.User;
import com.pawhub.repository.ChatThreadRepository;
import com.pawhub.repository.MessageRepository;
import com.pawhub.repository.UserFriendshipRepository;
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
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatThreadRepository chatThreadRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final UserFriendshipRepository userFriendshipRepository;
    private final FileStorageService fileStorageService;
    private final SimpMessagingTemplate messagingTemplate;
    private final AppNotificationService appNotificationService;

    @Transactional(readOnly = true)
    public List<ThreadSummaryDto> listThreads(SecurityUser principal) {
        return chatThreadRepository.findForUser(principal.getId()).stream()
                .map(t -> toSummary(t, principal.getId()))
                .sorted(Comparator.comparing(ThreadSummaryDto::messageRequestIncoming)
                        .reversed()
                        .thenComparing(
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

    /**
     * Opens or resumes a direct thread. If the users are not friends, the thread is (or stays) in a message-request
     * state: the requester may send only one intro while pending; the recipient may reply (which opens full DM) or
     * explicitly accept or decline. After a decline, the requester cannot send until the pair are friends.
     */
    @Transactional
    public ThreadIdResponse openOrCreateDirectThread(Long otherUserId, SecurityUser me) {
        if (otherUserId.equals(me.getId())) {
            throw new IllegalArgumentException("Cannot message yourself.");
        }
        userRepository.findById(otherUserId).orElseThrow(() -> new IllegalArgumentException("User not found."));
        boolean friends = areFriends(me.getId(), otherUserId);
        Optional<ChatThread> opt = chatThreadRepository.findDirectThread(me.getId(), otherUserId, ThreadType.DIRECT);
        if (opt.isPresent()) {
            ChatThread t = opt.get();
            if (t.getType() != ThreadType.DIRECT) {
                return new ThreadIdResponse(t.getId(), false);
            }
            if (!friends) {
                if (t.getDmRequestStatus() == DmRequestStatus.DECLINED) {
                    Long init = t.getDmRequestInitiatorId();
                    if (init != null && init.equals(me.getId())) {
                        throw new ResponseStatusException(
                                HttpStatus.FORBIDDEN,
                                "This message request was declined. You can chat again once you're friends.");
                    }
                    return new ThreadIdResponse(t.getId(), false);
                }
                if (t.getDmRequestStatus() == DmRequestStatus.PENDING) {
                    return new ThreadIdResponse(t.getId(), true);
                }
            }
            if (friends) {
                clearDmGate(t);
            }
            return new ThreadIdResponse(t.getId(), false);
        }
        User meUser = userRepository.getReferenceById(me.getId());
        User other = userRepository.getReferenceById(otherUserId);
        User p1 = meUser.getId() < other.getId() ? meUser : other;
        User p2 = meUser.getId() < other.getId() ? other : meUser;
        ChatThread t = ChatThread.builder()
                .type(ThreadType.DIRECT)
                .participantOne(p1)
                .participantTwo(p2)
                .build();
        if (!friends) {
            t.setDmRequestStatus(DmRequestStatus.PENDING);
            t.setDmRequestInitiatorId(me.getId());
        }
        chatThreadRepository.save(t);
        return new ThreadIdResponse(t.getId(), !friends);
    }

    /** Recipient accepts a pending direct message request — full DM unlocked. */
    @Transactional
    public void acceptMessageRequest(Long threadId, SecurityUser me) {
        ChatThread t = chatThreadRepository.findById(threadId).orElseThrow();
        assertParticipant(t, me.getId());
        if (t.getType() != ThreadType.DIRECT || t.getDmRequestStatus() != DmRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No pending message request here.");
        }
        Long init = t.getDmRequestInitiatorId();
        if (init == null || init.equals(me.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only the recipient can accept a message request.");
        }
        clearDmGate(t);
    }

    /** Recipient declines — requester cannot send until the pair become friends. */
    @Transactional
    public void declineMessageRequest(Long threadId, SecurityUser me) {
        ChatThread t = chatThreadRepository.findById(threadId).orElseThrow();
        assertParticipant(t, me.getId());
        if (t.getType() != ThreadType.DIRECT || t.getDmRequestStatus() != DmRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No pending message request here.");
        }
        Long init = t.getDmRequestInitiatorId();
        if (init == null || init.equals(me.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only the recipient can decline a message request.");
        }
        t.setDmRequestStatus(DmRequestStatus.DECLINED);
        chatThreadRepository.save(t);
    }

    private MessageDto saveMessage(Long threadId, Long senderId, String body, String attachmentUrl) {
        ChatThread t = chatThreadRepository.findById(threadId).orElseThrow();
        assertParticipant(t, senderId);
        enforceDmRequestGate(t, senderId);
        User sender = userRepository.getReferenceById(senderId);
        Message msg = Message.builder()
                .thread(t)
                .sender(sender)
                .body(body)
                .attachmentUrl(attachmentUrl)
                .build();
        messageRepository.save(msg);
        if (t.getType() == ThreadType.DIRECT && t.getDmRequestStatus() == DmRequestStatus.PENDING) {
            Long init = t.getDmRequestInitiatorId();
            if (init != null && !senderId.equals(init)) {
                ChatThread fresh = chatThreadRepository.findById(threadId).orElseThrow();
                if (fresh.getDmRequestStatus() == DmRequestStatus.PENDING) {
                    clearDmGate(fresh);
                }
            }
        }
        MessageDto dto = toMessageDto(msg);
        messagingTemplate.convertAndSend("/topic/threads." + threadId, dto);
        pushInboxToParticipants(t, ChatInboxEvent.message(threadId, dto));
        Long recipientId =
                t.getParticipantOne().getId().equals(senderId)
                        ? t.getParticipantTwo().getId()
                        : t.getParticipantOne().getId();
        Instant recipientLastRead = getReadAt(t, recipientId);
        Instant since = recipientLastRead != null ? recipientLastRead : Instant.EPOCH;
        long priorFromSenderSinceRead =
                messageRepository.countByThread_IdAndSender_IdAndCreatedAtAfter(threadId, senderId, since);
        boolean firstInPendingRequest =
                t.getType() == ThreadType.DIRECT
                        && t.getDmRequestStatus() == DmRequestStatus.PENDING
                        && Objects.equals(t.getDmRequestInitiatorId(), senderId)
                        && messageRepository.countByThreadId(threadId) == 1L;
        if (firstInPendingRequest) {
            appNotificationService.publishWithInboxNudge(
                    recipientId,
                    AppNotificationKind.MESSAGE_REQUEST_RECEIVED,
                    "Message request",
                    String.format("%s wants to connect. Open Messages to accept or decline.", sender.getDisplayName()),
                    "/messages/" + threadId,
                    "message",
                    sender.getAvatarUrl());
        }
        if (priorFromSenderSinceRead == 1L && !firstInPendingRequest) {
            String preview = body == null ? "" : body;
            if (preview.length() > 160) {
                preview = preview.substring(0, 157) + "…";
            }
            appNotificationService.publish(
                    recipientId,
                    AppNotificationKind.NEW_MESSAGE,
                    "New message",
                    String.format(
                            "You have a new message from %s.%s",
                            sender.getDisplayName(), preview.isEmpty() ? "" : " " + preview),
                    "/messages/" + threadId,
                    "message",
                    sender.getAvatarUrl());
        }
        return dto;
    }

    private void enforceDmRequestGate(ChatThread t, Long senderId) {
        if (t.getType() != ThreadType.DIRECT) {
            return;
        }
        DmRequestStatus st = t.getDmRequestStatus();
        if (st == null) {
            return;
        }
        long p1 = t.getParticipantOne().getId();
        long p2 = t.getParticipantTwo().getId();
        if (st == DmRequestStatus.DECLINED) {
            if (!areFriends(p1, p2)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "This conversation isn't available until you're friends.");
            }
            return;
        }
        if (st == DmRequestStatus.PENDING) {
            Long init = t.getDmRequestInitiatorId();
            if (init == null) {
                return;
            }
            if (senderId.equals(init)) {
                long alreadySent = messageRepository.countByThread_IdAndSender_Id(t.getId(), senderId);
                if (alreadySent >= 1) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "You can only send one message until they reply or accept your request.");
                }
            }
            // Recipient may reply; first reply clears the request (see saveMessage).
        }
    }

    private void clearDmGate(ChatThread t) {
        if (t.getDmRequestStatus() != null || t.getDmRequestInitiatorId() != null) {
            t.setDmRequestStatus(null);
            t.setDmRequestInitiatorId(null);
            chatThreadRepository.save(t);
        }
    }

    private boolean areFriends(long userIdA, long userIdB) {
        long low = Math.min(userIdA, userIdB);
        long high = Math.max(userIdA, userIdB);
        return userFriendshipRepository
                .findByUserLow_IdAndUserHigh_Id(low, high)
                .filter(f -> f.getStatus() == FriendshipStatus.ACCEPTED)
                .isPresent();
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
        boolean incoming = false;
        boolean outgoing = false;
        boolean declined = false;
        boolean locked = false;
        if (t.getType() == ThreadType.DIRECT && t.getDmRequestStatus() != null) {
            Long init = t.getDmRequestInitiatorId();
            if (t.getDmRequestStatus() == DmRequestStatus.PENDING && init != null) {
                if (init.equals(me)) {
                    outgoing = true;
                    long mySent = messageRepository.countByThread_IdAndSender_Id(t.getId(), me);
                    locked = mySent >= 1;
                } else {
                    incoming = true;
                    locked = false;
                }
            }
            if (t.getDmRequestStatus() == DmRequestStatus.DECLINED && init != null && init.equals(me)) {
                declined = true;
            }
            long p1 = t.getParticipantOne().getId();
            long p2 = t.getParticipantTwo().getId();
            if (t.getDmRequestStatus() == DmRequestStatus.DECLINED && !areFriends(p1, p2)) {
                locked = true;
            }
        }
        return new ThreadSummaryDto(
                t.getId(),
                t.getType().name(),
                other.getId(),
                other.getDisplayName(),
                other.getAvatarUrl(),
                t.getMarketListingId(),
                preview,
                lastAt,
                unread,
                incoming,
                outgoing,
                declined,
                locked);
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
