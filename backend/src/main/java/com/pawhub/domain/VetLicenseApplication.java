package com.pawhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "vet_license_applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VetLicenseApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "license_number", nullable = false, length = 128)
    private String licenseNumber;

    @Column(nullable = false, length = 255)
    private String university;

    @Column(name = "years_experience")
    private Integer yearsExperience;

    @Column(length = 64)
    private String phone;

    @Column(name = "professional_bio", columnDefinition = "TEXT")
    private String professionalBio;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private VetVerificationStatus status = VetVerificationStatus.PENDING;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    /** JSON array of public URLs for uploaded license / ID / diploma files */
    @Column(name = "supporting_document_urls", columnDefinition = "TEXT")
    private String supportingDocumentUrls;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
