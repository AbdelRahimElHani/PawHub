package com.pawhub.repository.hub;

import com.pawhub.domain.hub.HubForumPost;
import com.pawhub.domain.hub.HubForumRoom;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HubForumPostRepository extends JpaRepository<HubForumPost, Long> {
    List<HubForumPost> findByRoomOrderByCreatedAtDesc(HubForumRoom room);
}
