package com.pawhub.repository.hub;

import com.pawhub.domain.hub.HubForumPostVote;
import com.pawhub.domain.hub.HubForumPostVoteId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HubForumPostVoteRepository extends JpaRepository<HubForumPostVote, HubForumPostVoteId> {
    void deleteAllByPostId(Long postId);

    java.util.Optional<HubForumPostVote> findByPostIdAndUserId(Long postId, Long userId);
}
