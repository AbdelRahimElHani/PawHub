package com.pawhub.repository;

import com.pawhub.domain.PawMatch;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PawMatchRepository extends JpaRepository<PawMatch, Long> {

    @Query(
            """
            SELECT m FROM PawMatch m
            JOIN FETCH m.catA ca JOIN FETCH ca.user
            JOIN FETCH m.catB cb JOIN FETCH cb.user
            JOIN FETCH m.thread
            WHERE ca.user.id = :uid OR cb.user.id = :uid
            ORDER BY m.createdAt DESC
            """)
    List<PawMatch> findForUser(@Param("uid") Long userId);

    @Query(
            """
            SELECT m FROM PawMatch m
            WHERE (m.catA.id = :c1 AND m.catB.id = :c2)
               OR (m.catA.id = :c2 AND m.catB.id = :c1)
            """)
    Optional<PawMatch> findByCatPair(@Param("c1") Long catId1, @Param("c2") Long catId2);
}
