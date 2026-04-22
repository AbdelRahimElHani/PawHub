package com.pawhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "cats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String name;

    private String breed;

    @Column(name = "age_months")
    private Integer ageMonths;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(length = 16)
    private CatGender gender;

    @Column(columnDefinition = "TEXT")
    private String bio;

    /** PawMatch: which genders of other cats to show (reciprocal filter also applies). */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "pref_looking_for_gender", nullable = false, length = 16)
    @Builder.Default
    private MatchGenderPreference prefLookingForGender = MatchGenderPreference.ANY;

    @Column(name = "pref_min_age_months")
    private Integer prefMinAgeMonths;

    @Column(name = "pref_max_age_months")
    private Integer prefMaxAgeMonths;

    /** This cat’s typical behavior / energy (for matching). */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "behavior", length = 32)
    private CatBehavior behavior;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "pref_behavior", nullable = false, length = 32)
    @Builder.Default
    private MatchBehaviorPreference prefBehavior = MatchBehaviorPreference.ANY;

    /** If set, only show other cats whose breed equals this (case-insensitive). */
    @Column(name = "pref_breed", length = 255)
    private String prefBreed;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "cat", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<CatPhoto> photos = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
