package com.pawhub.domain;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "shelters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shelter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String name;

    private String city;
    private String region;
    private String phone;

    @Column(name = "email_contact")
    private String emailContact;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "legal_entity_name")
    private String legalEntityName;

    @Column(name = "ein_or_tax_id", length = 64)
    private String einOrTaxId;

    @Column(name = "year_founded")
    private Integer yearFounded;

    @Column(name = "website_url", length = 512)
    private String websiteUrl;

    @Column(name = "facility_address", columnDefinition = "TEXT")
    private String facilityAddress;

    @Column(name = "mailing_same_as_facility")
    private Boolean mailingSameAsFacility;

    @Column(name = "mailing_address", columnDefinition = "TEXT")
    private String mailingAddress;

    @Column(name = "animal_focus", length = 128)
    private String animalFocus;

    @Column(name = "avg_monthly_intakes")
    private Integer avgMonthlyIntakes;

    @Column(name = "avg_cats_in_care")
    private Integer avgCatsInCare;

    @Column(name = "staffing_overview", columnDefinition = "TEXT")
    private String staffingOverview;

    @Column(name = "volunteer_program_summary", columnDefinition = "TEXT")
    private String volunteerProgramSummary;

    @Column(name = "state_license_status", length = 32)
    private String stateLicenseStatus;

    @Column(name = "home_visit_policy", length = 32)
    private String homeVisitPolicy;

    @Column(name = "adoption_fee_policy", columnDefinition = "TEXT")
    private String adoptionFeePolicy;

    @Column(name = "spay_neuter_policy", columnDefinition = "TEXT")
    private String spayNeuterPolicy;

    @Column(name = "return_policy", columnDefinition = "TEXT")
    private String returnPolicy;

    @Column(name = "medical_care_description", columnDefinition = "TEXT")
    private String medicalCareDescription;

    @Column(name = "behavior_modification_resources", columnDefinition = "TEXT")
    private String behaviorModificationResources;

    @Column(name = "transport_assistance_notes", columnDefinition = "TEXT")
    private String transportAssistanceNotes;

    @Column(name = "disaster_contingency_plan", columnDefinition = "TEXT")
    private String disasterContingencyPlan;

    @Column(name = "character_references", columnDefinition = "TEXT")
    private String characterReferences;

    @Column(name = "mission_statement", columnDefinition = "TEXT")
    private String missionStatement;

    @Column(name = "board_chair_or_director_contact", columnDefinition = "TEXT")
    private String boardChairOrDirectorContact;

    @Column(name = "social_website_handles", columnDefinition = "TEXT")
    private String socialWebsiteHandles;

    @Column(name = "doc_nonprofit_url", length = 1024)
    private String docNonprofitUrl;

    @Column(name = "doc_facility_license_url", length = 1024)
    private String docFacilityLicenseUrl;

    @Column(name = "doc_insurance_url", length = 1024)
    private String docInsuranceUrl;

    @Column(name = "doc_protocols_url", length = 1024)
    private String docProtocolsUrl;

    @Column(name = "profile_completed_at")
    private Instant profileCompletedAt;

    @Column(name = "profile_last_saved_at")
    private Instant profileLastSavedAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ShelterStatus status = ShelterStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
