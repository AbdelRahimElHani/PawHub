package com.pawhub.repository;

import com.pawhub.domain.Swipe;
import com.pawhub.domain.SwipeDirection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SwipeRepository extends JpaRepository<Swipe, Long> {

    Optional<Swipe> findByCatIdAndTargetCatId(Long catId, Long targetCatId);

    boolean existsByCatIdAndTargetCatIdAndDirection(Long catId, Long targetCatId, SwipeDirection direction);
}
