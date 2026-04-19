package com.pawhub.domain.hub;

import java.io.Serializable;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HubForumPostVoteId implements Serializable {
    private Long postId;
    private Long userId;
}
