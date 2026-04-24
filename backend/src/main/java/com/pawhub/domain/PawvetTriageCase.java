package com.pawhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "pawvet_triage_cases")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PawvetTriageCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    @Column(name = "cat_id")
    private Long catId;

    @Column(name = "cat_name", nullable = false)
    private String catName;

    @Column(name = "cat_snapshot_json", columnDefinition = "TEXT")
    private String catSnapshotJson;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String symptoms;

    @Column(name = "media_description", nullable = false, columnDefinition = "TEXT")
    private String mediaDescription;

    @Column(name = "attachment_urls_json", columnDefinition = "TEXT")
    private String attachmentUrlsJson;

    @Column(nullable = false, length = 16)
    private String urgency;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 24)
    private PawvetTriageCaseStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vet_user_id")
    private User vet;

    @Column(name = "vet_display_name")
    private String vetDisplayName;

    @Column(name = "vet_avatar_url", length = 1024)
    private String vetAvatarUrl;

    @Column(name = "messages_json", nullable = false, columnDefinition = "LONGTEXT")
    private String messagesJson;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
