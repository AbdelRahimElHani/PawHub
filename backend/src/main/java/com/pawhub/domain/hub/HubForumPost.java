package com.pawhub.domain.hub;

import com.pawhub.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "hub_forum_posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HubForumPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private HubForumRoom room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_user_id", nullable = false)
    private User author;

    @Column(nullable = false, length = 512)
    private String title;

    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String body;

    @Column(nullable = false)
    private int score;

    @Column(name = "comment_count", nullable = false)
    private int commentCount;

    @Column(name = "helpful_comment_id")
    private Long helpfulCommentId;

    /** When true, thread is hidden from room lists; author and admins can still open it by direct link. */
    @Column(name = "removed_by_admin", nullable = false)
    @JdbcTypeCode(SqlTypes.TINYINT)
    @Builder.Default
    private boolean removedByAdmin = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
