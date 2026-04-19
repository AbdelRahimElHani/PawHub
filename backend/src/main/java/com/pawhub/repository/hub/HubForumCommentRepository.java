package com.pawhub.repository.hub;

import com.pawhub.domain.hub.HubForumComment;
import com.pawhub.domain.hub.HubForumPost;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HubForumCommentRepository extends JpaRepository<HubForumComment, Long> {
    List<HubForumComment> findByPostOrderByIdAsc(HubForumPost post);

    int countByPost(HubForumPost post);
}
