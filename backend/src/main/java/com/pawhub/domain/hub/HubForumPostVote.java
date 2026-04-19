package com.pawhub.domain.hub;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "hub_forum_post_votes")
@IdClass(HubForumPostVoteId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HubForumPostVote {

    @Id
    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "vote_value", nullable = false)
    private int voteValue;
}
