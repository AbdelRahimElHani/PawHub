package com.pawhub.repository;

import com.pawhub.domain.FriendshipStatus;
import com.pawhub.domain.UserFriendship;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserFriendshipRepository extends JpaRepository<UserFriendship, Long> {

    Optional<UserFriendship> findByUserLow_IdAndUserHigh_Id(long userLowId, long userHighId);

    @Query(
            """
            SELECT DISTINCT f FROM UserFriendship f
            JOIN FETCH f.userLow JOIN FETCH f.userHigh JOIN FETCH f.initiator
            WHERE f.status = :status
              AND (f.userLow.id = :uid OR f.userHigh.id = :uid)
            """)
    List<UserFriendship> findByUserAndStatusWithUsers(
            @Param("uid") long userId, @Param("status") FriendshipStatus status);

    @Query(
            """
            SELECT DISTINCT f FROM UserFriendship f
            JOIN FETCH f.userLow JOIN FETCH f.userHigh
            WHERE f.status = :status
            """)
    List<UserFriendship> findAllByStatusWithUsers(@Param("status") FriendshipStatus status);
}
