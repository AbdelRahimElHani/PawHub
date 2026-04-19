package com.pawhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "market_listings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketListing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cat_id")
    private Cat cat;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "price_cents", nullable = false)
    private long priceCents;

    private String city;
    private String region;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ListingStatus status = ListingStatus.ACTIVE;

    @Column(name = "photo_url", length = 1024)
    private String photoUrl;

    // ── Paw Market extensions ──────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(length = 32)
    private PawCategory category;

    @Column(name = "is_free", nullable = false)
    @JdbcTypeCode(SqlTypes.TINYINT)
    @Builder.Default
    private boolean isFree = false;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(name = "city_text", length = 512)
    private String cityText;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "paw_status", nullable = false, length = 32)
    @Builder.Default
    private PawListingStatus pawStatus = PawListingStatus.Available;

    /** Remaining units for sale (decremented on each completed purchase). */
    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private int stockQuantity = 1;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "market_listing_images", joinColumns = @JoinColumn(name = "listing_id"))
    @Column(name = "image_url")
    @OrderColumn(name = "sort_order")
    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    // ──────────────────────────────────────────────────────────────────────

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
