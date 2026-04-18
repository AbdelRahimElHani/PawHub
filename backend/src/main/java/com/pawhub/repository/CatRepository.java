package com.pawhub.repository;

import com.pawhub.domain.Cat;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CatRepository extends JpaRepository<Cat, Long> {

    List<Cat> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query(
            """
            SELECT DISTINCT c FROM Cat c
            LEFT JOIN FETCH c.photos
            WHERE c.id <> :myCatId
            AND c.user.id <> :ownerUserId
            AND c.id NOT IN (SELECT s.targetCat.id FROM Swipe s WHERE s.cat.id = :myCatId)
            ORDER BY c.id ASC
            """)
    List<Cat> findCandidates(@Param("myCatId") Long myCatId, @Param("ownerUserId") Long ownerUserId);
}
