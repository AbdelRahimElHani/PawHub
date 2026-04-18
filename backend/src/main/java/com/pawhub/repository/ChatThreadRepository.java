package com.pawhub.repository;

import com.pawhub.domain.ChatThread;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatThreadRepository extends JpaRepository<ChatThread, Long> {

    @Query(
            """
            SELECT DISTINCT t FROM ChatThread t
            JOIN FETCH t.participantOne JOIN FETCH t.participantTwo
            WHERE t.participantOne.id = :uid OR t.participantTwo.id = :uid
            """)
    List<ChatThread> findForUser(@Param("uid") Long userId);

    @Query(
            """
            SELECT t FROM ChatThread t
            WHERE t.type = 'LISTING'
            AND t.marketListingId = :listingId
            AND ((t.participantOne.id = :u1 AND t.participantTwo.id = :u2)
              OR (t.participantOne.id = :u2 AND t.participantTwo.id = :u1))
            """)
    Optional<ChatThread> findListingThread(
            @Param("listingId") Long listingId, @Param("u1") Long userId1, @Param("u2") Long userId2);
}
