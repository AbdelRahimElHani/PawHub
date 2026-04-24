package com.pawhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "chat_threads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatThread {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 32)
    private ThreadType type;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_one_id")
    private User participantOne;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_two_id")
    private User participantTwo;

    @Column(name = "market_listing_id")
    private Long marketListingId;

    @Column(name = "match_id")
    private Long matchId;

    @Column(name = "adoption_inquiry_id")
    private Long adoptionInquiryId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "participant_one_last_read_at")
    private Instant participantOneLastReadAt;

    @Column(name = "participant_two_last_read_at")
    private Instant participantTwoLastReadAt;

    /** When set on {@link ThreadType#DIRECT}, messaging is gated until accepted or declined. */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "dm_request_status", length = 32)
    private DmRequestStatus dmRequestStatus;

    /** User who sent the message request (only they may send while {@link #dmRequestStatus} is {@link DmRequestStatus#PENDING}). */
    @Column(name = "dm_request_initiator_id")
    private Long dmRequestInitiatorId;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
