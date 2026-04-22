package com.pawhub.web.dto;

import com.pawhub.domain.Shelter;

public final class ShelterDtoMapper {

    private ShelterDtoMapper() {}

    public static ShelterDto fromEntity(Shelter s) {
        return new ShelterDto(
                s.getId(),
                s.getUser().getId(),
                s.getName(),
                s.getCity(),
                s.getRegion(),
                s.getPhone(),
                s.getEmailContact(),
                s.getBio(),
                s.getStatus().name(),
                s.getLegalEntityName(),
                s.getEinOrTaxId(),
                s.getYearFounded(),
                s.getWebsiteUrl(),
                s.getFacilityAddress(),
                s.getMailingSameAsFacility(),
                s.getMailingAddress(),
                s.getAnimalFocus(),
                s.getAvgMonthlyIntakes(),
                s.getAvgCatsInCare(),
                s.getStaffingOverview(),
                s.getVolunteerProgramSummary(),
                s.getStateLicenseStatus(),
                s.getHomeVisitPolicy(),
                s.getAdoptionFeePolicy(),
                s.getSpayNeuterPolicy(),
                s.getReturnPolicy(),
                s.getMedicalCareDescription(),
                s.getBehaviorModificationResources(),
                s.getTransportAssistanceNotes(),
                s.getDisasterContingencyPlan(),
                s.getCharacterReferences(),
                s.getMissionStatement(),
                s.getBoardChairOrDirectorContact(),
                s.getSocialWebsiteHandles(),
                s.getDocNonprofitUrl(),
                s.getDocFacilityLicenseUrl(),
                s.getDocInsuranceUrl(),
                s.getDocProtocolsUrl(),
                s.getProfileCompletedAt(),
                s.getProfileLastSavedAt());
    }
}
