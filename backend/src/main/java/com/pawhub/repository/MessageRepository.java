package com.pawhub.repository;

import com.pawhub.domain.Message;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {

    Page<Message> findByThreadIdOrderByCreatedAtDesc(Long threadId, Pageable pageable);

    Optional<Message> findFirstByThread_IdOrderByCreatedAtDesc(Long threadId);

    long countByThreadId(Long threadId);

    long countByThread_IdAndSender_Id(Long threadId, Long senderId);

    /** Messages from {@code senderId} in the thread strictly after {@code createdAfter} (for notification coalescing). */
    long countByThread_IdAndSender_IdAndCreatedAtAfter(Long threadId, Long senderId, Instant createdAfter);
}
