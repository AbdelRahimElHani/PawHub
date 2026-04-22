package com.pawhub.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Full shelter partner dossier. Send the complete form on each save; use {@code markComplete} when ready for admin
 * review checklist.
 */
public record ShelterProfileUpdateRequest(
        Boolean markComplete,
        @NotBlank @Size(max = 255) String name,
        @Size(max = 255) String city,
        @Size(max = 255) String region,
        @Size(max = 64) String phone,
        @Size(max = 255) String emailContact,
        @Size(max = 4000) String bio,
        @Size(max = 255) String legalEntityName,
        @Size(max = 64) String einOrTaxId,
        Integer yearFounded,
        @Size(max = 512) String websiteUrl,
        @Size(max = 8000) String facilityAddress,
        Boolean mailingSameAsFacility,
        @Size(max = 8000) String mailingAddress,
        @Size(max = 128) String animalFocus,
        Integer avgMonthlyIntakes,
        Integer avgCatsInCare,
        @Size(max = 4000) String staffingOverview,
        @Size(max = 4000) String volunteerProgramSummary,
        @Size(max = 32) String stateLicenseStatus,
        @Size(max = 32) String homeVisitPolicy,
        @Size(max = 4000) String adoptionFeePolicy,
        @Size(max = 4000) String spayNeuterPolicy,
        @Size(max = 4000) String returnPolicy,
        @Size(max = 4000) String medicalCareDescription,
        @Size(max = 4000) String behaviorModificationResources,
        @Size(max = 4000) String transportAssistanceNotes,
        @Size(max = 4000) String disasterContingencyPlan,
        @Size(max = 4000) String characterReferences,
        @Size(max = 4000) String missionStatement,
        @Size(max = 2000) String boardChairOrDirectorContact,
        @Size(max = 2000) String socialWebsiteHandles) {}
