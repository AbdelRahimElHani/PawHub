package com.pawhub.repository;

import com.pawhub.domain.PawReview;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PawReviewRepository extends JpaRepository<PawReview, Long> {

    List<PawReview> findByTargetUserIdOrderByCreatedAtDesc(Long targetUserId);

    boolean existsByOrderIdAndReviewerId(Long orderId, Long reviewerId);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM PawReview r WHERE r.targetUser.id = :uid")
    double averageRatingForUser(@Param("uid") Long userId);

    long countByTargetUserId(Long targetUserId);
}
