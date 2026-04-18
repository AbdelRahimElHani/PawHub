package com.pawhub.service;

import com.pawhub.domain.ChatThread;
import com.pawhub.domain.Message;
import com.pawhub.domain.User;
import com.pawhub.repository.ChatThreadRepository;
import com.pawhub.repository.MessageRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.MessageDto;
import com.pawhub.web.dto.ThreadSummaryDto;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatThreadRepository chatThreadRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<ThreadSummaryDto> listThreads(SecurityUser principal) {
        return chatThreadRepository.findForUser(principal.getId()).stream()
                .sorted(Comparator.comparing(ChatThread::getCreatedAt).reversed())
                .map(t -> toSummary(t, principal.getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> messages(Long threadId, int page, int size, SecurityUser principal) {
        ChatThread t = chatThreadRepository.findById(threadId).orElseThrow();
        assertParticipant(t, principal.getId());
        return messageRepository
                .findByThreadIdOrderByCreatedAtDesc(threadId, PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(m -> new MessageDto(m.getId(), m.getSender().getId(), m.getBody(), m.getCreatedAt()));
    }

    @Transactional
    public MessageDto sendMessage(Long threadId, String body, Long senderId) {
        ChatThread t = chatThreadRepository.findById(threadId).orElseThrow();
        assertParticipant(t, senderId);
        User sender = userRepository.getReferenceById(senderId);
        Message msg = Message.builder().thread(t).sender(sender).body(body.trim()).build();
        messageRepository.save(msg);
        MessageDto dto = new MessageDto(msg.getId(), senderId, msg.getBody(), msg.getCreatedAt());
        messagingTemplate.convertAndSend("/topic/threads." + threadId, dto);
        return dto;
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
        return new ThreadSummaryDto(
                t.getId(), t.getType().name(), other.getId(), other.getDisplayName(), t.getMarketListingId());
    }
}
