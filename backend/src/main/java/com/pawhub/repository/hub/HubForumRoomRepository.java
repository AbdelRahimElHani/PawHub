package com.pawhub.repository.hub;

import com.pawhub.domain.hub.HubForumRoom;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HubForumRoomRepository extends JpaRepository<HubForumRoom, Long> {
    Optional<HubForumRoom> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
