package com.pawhub.service;

import com.pawhub.domain.*;
import com.pawhub.repository.*;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.AdoptionListingDto;
import java.util.Optional;
import com.pawhub.web.dto.AdoptionListingUpsertRequest;
import com.pawhub.web.dto.ShelterDocumentKind;
import com.pawhub.web.dto.ShelterDto;
import com.pawhub.web.dto.ShelterDtoMapper;
import com.pawhub.web.dto.ShelterProfileUpdateRequest;
import com.pawhub.web.dto.ShelterUpsertRequest;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AdoptionService {

    private final ShelterRepository shelterRepository;
    private final AdoptionListingRepository adoptionListingRepository;
    private final AdoptionInquiryRepository adoptionInquiryRepository;
    private final ChatThreadRepository chatThreadRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public ShelterDto applyShelter(ShelterUpsertRequest req, SecurityUser principal) {
        if (shelterRepository.findByUserId(principal.getId()).isPresent()) {
            throw new IllegalArgumentException("Shelter application already exists");
        }
        User user = userRepository.getReferenceById(principal.getId());
        Shelter s = Shelter.builder()
                .user(user)
                .name(req.name())
                .city(req.city())
                .region(req.region())
                .phone(req.phone())
                .emailContact(req.emailContact())
                .bio(req.bio())
                .status(ShelterStatus.PENDING)
                .build();
        shelterRepository.save(s);
        return ShelterDtoMapper.fromEntity(s);
    }

    public Optional<ShelterDto> myShelter(SecurityUser principal) {
        return shelterRepository.findByUserId(principal.getId()).map(ShelterDtoMapper::fromEntity);
    }

    @Transactional
    public ShelterDto updateShelterProfile(ShelterProfileUpdateRequest req, SecurityUser principal) {
        requireShelterAccount(principal);
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        applyProfileRequest(s, req);
        s.setProfileLastSavedAt(Instant.now());
        if (Boolean.TRUE.equals(req.markComplete())) {
            validateProfileComplete(s);
            s.setProfileCompletedAt(Instant.now());
        }
        return ShelterDtoMapper.fromEntity(s);
    }

    @Transactional
    public ShelterDto uploadShelterDocument(ShelterDocumentKind kind, MultipartFile file, SecurityUser principal)
            throws Exception {
        requireShelterAccount(principal);
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        String url = fileStorageService.store(file, "shelter-doc");
        switch (kind) {
            case NONPROFIT -> s.setDocNonprofitUrl(url);
            case FACILITY_LICENSE -> s.setDocFacilityLicenseUrl(url);
            case INSURANCE -> s.setDocInsuranceUrl(url);
            case OPERATING_PROTOCOLS -> s.setDocProtocolsUrl(url);
        }
        s.setProfileLastSavedAt(Instant.now());
        return ShelterDtoMapper.fromEntity(s);
    }

    @Transactional(readOnly = true)
    public AdoptionListingDto getListing(Long id) {
        AdoptionListing l = adoptionListingRepository.findById(id).orElseThrow();
        if (l.getShelter().getStatus() != ShelterStatus.APPROVED || l.getStatus() != ListingStatus.ACTIVE) {
            throw new IllegalStateException("Listing not available");
        }
        return toAdoptionDto(l);
    }

    @Transactional(readOnly = true)
    public List<AdoptionListingDto> browse() {
        return adoptionListingRepository.findByStatusOrderByCreatedAtDesc(ListingStatus.ACTIVE).stream()
                .filter(l -> l.getShelter().getStatus() == ShelterStatus.APPROVED)
                .map(this::toAdoptionDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdoptionListingDto> mineListings(SecurityUser principal) {
        requireVerifiedShelterPublisher(principal);
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        return adoptionListingRepository.findByShelterIdAndStatusOrderByCreatedAtDesc(s.getId(), ListingStatus.ACTIVE)
                .stream()
                .map(this::toAdoptionDto)
                .toList();
    }

    @Transactional
    public AdoptionListingDto createListing(AdoptionListingUpsertRequest req, SecurityUser principal) {
        requireVerifiedShelterPublisher(principal);
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        AdoptionListing l = AdoptionListing.builder()
                .shelter(s)
                .title(req.title())
                .petName(req.petName())
                .description(req.description())
                .breed(req.breed())
                .ageMonths(req.ageMonths())
                .status(ListingStatus.ACTIVE)
                .build();
        adoptionListingRepository.save(l);
        return toAdoptionDto(l);
    }

    @Transactional
    public AdoptionListingDto uploadListingPhoto(Long listingId, MultipartFile photo, SecurityUser principal)
            throws Exception {
        requireVerifiedShelterPublisher(principal);
        if (photo == null || photo.isEmpty()) {
            throw new IllegalArgumentException("Photo file is required");
        }
        AdoptionListing l = adoptionListingRepository.findById(listingId).orElseThrow();
        if (!l.getShelter().getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Not your listing");
        }
        l.setPhotoUrl(fileStorageService.store(photo, "adopt"));
        adoptionListingRepository.save(l);
        return toAdoptionDto(l);
    }

    @Transactional
    public Long inquire(Long listingId, SecurityUser principal) {
        AdoptionListing listing = adoptionListingRepository.findById(listingId).orElseThrow();
        if (listing.getShelter().getStatus() != ShelterStatus.APPROVED) {
            throw new IllegalStateException("Listing not available");
        }
        User shelterOwner = listing.getShelter().getUser();
        if (shelterOwner.getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Cannot inquire on own listing");
        }
        return adoptionInquiryRepository
                .findByAdoptionListingIdAndUserId(listingId, principal.getId())
                .map(i -> i.getThread().getId())
                .orElseGet(
                        () -> {
                            User inquirer = userRepository.getReferenceById(principal.getId());
                            User p1 = inquirer.getId() < shelterOwner.getId() ? inquirer : shelterOwner;
                            User p2 = inquirer.getId() < shelterOwner.getId() ? shelterOwner : inquirer;
                            ChatThread thread = ChatThread.builder()
                                    .type(ThreadType.ADOPTION)
                                    .participantOne(p1)
                                    .participantTwo(p2)
                                    .build();
                            chatThreadRepository.save(thread);
                            AdoptionInquiry inq = AdoptionInquiry.builder()
                                    .adoptionListing(listing)
                                    .user(inquirer)
                                    .thread(thread)
                                    .build();
                            adoptionInquiryRepository.save(inq);
                            thread.setAdoptionInquiryId(inq.getId());
                            chatThreadRepository.save(thread);
                            return inq.getThread().getId();
                        });
    }

    private static void applyProfileRequest(Shelter s, ShelterProfileUpdateRequest req) {
        s.setName(req.name().trim());
        s.setCity(trimToNull(req.city()));
        s.setRegion(trimToNull(req.region()));
        s.setPhone(trimToNull(req.phone()));
        s.setEmailContact(trimToNull(req.emailContact()));
        s.setBio(trimToNull(req.bio()));
        s.setLegalEntityName(trimToNull(req.legalEntityName()));
        s.setEinOrTaxId(trimToNull(req.einOrTaxId()));
        s.setYearFounded(req.yearFounded());
        s.setWebsiteUrl(trimToNull(req.websiteUrl()));
        s.setFacilityAddress(trimToNull(req.facilityAddress()));
        s.setMailingSameAsFacility(req.mailingSameAsFacility());
        s.setMailingAddress(trimToNull(req.mailingAddress()));
        s.setAnimalFocus(trimToNull(req.animalFocus()));
        s.setAvgMonthlyIntakes(req.avgMonthlyIntakes());
        s.setAvgCatsInCare(req.avgCatsInCare());
        s.setStaffingOverview(trimToNull(req.staffingOverview()));
        s.setVolunteerProgramSummary(trimToNull(req.volunteerProgramSummary()));
        s.setStateLicenseStatus(trimToNull(req.stateLicenseStatus()));
        s.setHomeVisitPolicy(trimToNull(req.homeVisitPolicy()));
        s.setAdoptionFeePolicy(trimToNull(req.adoptionFeePolicy()));
        s.setSpayNeuterPolicy(trimToNull(req.spayNeuterPolicy()));
        s.setReturnPolicy(trimToNull(req.returnPolicy()));
        s.setMedicalCareDescription(trimToNull(req.medicalCareDescription()));
        s.setBehaviorModificationResources(trimToNull(req.behaviorModificationResources()));
        s.setTransportAssistanceNotes(trimToNull(req.transportAssistanceNotes()));
        s.setDisasterContingencyPlan(trimToNull(req.disasterContingencyPlan()));
        s.setCharacterReferences(trimToNull(req.characterReferences()));
        s.setMissionStatement(trimToNull(req.missionStatement()));
        s.setBoardChairOrDirectorContact(trimToNull(req.boardChairOrDirectorContact()));
        s.setSocialWebsiteHandles(trimToNull(req.socialWebsiteHandles()));
    }

    private static void validateProfileComplete(Shelter s) {
        StringBuilder missing = new StringBuilder();
        need(missing, "Legal / registered name", s.getLegalEntityName());
        need(missing, "Physical facility address", s.getFacilityAddress());
        need(missing, "Mission statement", s.getMissionStatement());
        need(missing, "Medical & veterinary care description", s.getMedicalCareDescription());
        need(missing, "Character references (3)", s.getCharacterReferences());
        need(missing, "Disaster / continuity plan", s.getDisasterContingencyPlan());
        need(missing, "Return / reclamation policy", s.getReturnPolicy());
        need(missing, "Spay/neuter policy", s.getSpayNeuterPolicy());
        need(missing, "Adoption fees & donations model", s.getAdoptionFeePolicy());
        need(missing, "State license / registration status", s.getStateLicenseStatus());
        need(missing, "Home visit policy", s.getHomeVisitPolicy());
        need(missing, "Primary species focus", s.getAnimalFocus());
        need(missing, "Staffing overview", s.getStaffingOverview());
        need(missing, "Volunteer program summary", s.getVolunteerProgramSummary());
        need(missing, "Board or director contact", s.getBoardChairOrDirectorContact());
        if (s.getYearFounded() == null) {
            missing.append("Year founded. ");
        }
        if (s.getAvgMonthlyIntakes() == null) {
            missing.append("Average monthly intakes. ");
        }
        if (s.getAvgCatsInCare() == null) {
            missing.append("Average cats in care. ");
        }
        need(missing, "Proof of nonprofit / charitable status (upload)", s.getDocNonprofitUrl());
        need(missing, "Facility license or inspection document (upload)", s.getDocFacilityLicenseUrl());
        need(missing, "Liability insurance certificate (upload)", s.getDocInsuranceUrl());
        need(missing, "Standard operating procedures (upload)", s.getDocProtocolsUrl());
        if (missing.length() > 0) {
            throw new IllegalArgumentException(
                    "Profile is not ready for verification yet. Please complete: " + missing.toString().trim());
        }
    }

    private static void need(StringBuilder missing, String label, String value) {
        if (value == null || value.isBlank()) {
            missing.append(label).append(". ");
        }
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private void requireShelterAccount(SecurityUser principal) {
        if (principal.getUser().getAccountType() != UserAccountType.SHELTER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Detailed shelter profiles can only be edited by shelter organization accounts.");
        }
    }

    private AdoptionListingDto toAdoptionDto(AdoptionListing l) {
        return new AdoptionListingDto(
                l.getId(),
                l.getShelter().getId(),
                l.getTitle(),
                l.getPetName(),
                l.getDescription(),
                l.getBreed(),
                l.getAgeMonths(),
                l.getPhotoUrl(),
                l.getStatus().name(),
                l.getShelter().getName());
    }

    /**
     * Adoption listings may only be created by organization accounts registered as shelters
     * and verified (approved) by an admin.
     */
    private void requireVerifiedShelterPublisher(SecurityUser principal) {
        if (principal.getUser().getAccountType() != UserAccountType.SHELTER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only verified shelter organization accounts can publish adoption listings.");
        }
        Shelter s = shelterRepository
                .findByUserId(principal.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Complete your shelter profile before posting listings."));
        if (s.getStatus() != ShelterStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Your shelter is pending admin verification. You can publish listings after you are verified.");
        }
    }
}
