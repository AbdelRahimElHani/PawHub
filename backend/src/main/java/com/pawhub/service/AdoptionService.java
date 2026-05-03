package com.pawhub.service;

import com.pawhub.config.PawhubProperties;
import com.pawhub.domain.*;
import com.pawhub.repository.*;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.AdoptionListingDto;
import com.pawhub.web.dto.AdoptionListingUpsertRequest;
import com.pawhub.web.dto.AdminRemoveAdoptionListingRequest;
import com.pawhub.web.dto.MessageDto;
import com.pawhub.web.dto.ShelterDocumentKind;
import com.pawhub.web.dto.ShelterDto;
import com.pawhub.web.dto.ShelterDtoMapper;
import com.pawhub.web.dto.ShelterProfileUpdateRequest;
import com.pawhub.web.dto.ShelterUpsertRequest;
import com.pawhub.web.dto.SubmitShelterAppealRequest;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
    private final AppNotificationService appNotificationService;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PawhubProperties pawhubProperties;
    private final AiCatCheckService aiCatCheckService;
    private final ChatService chatService;

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
        appNotificationService.publishToAdmins(
                AppNotificationKind.ADMIN_SHELTER_REGISTERED,
                "New shelter application",
                String.format("%s registered a shelter profile (pending review).", s.getName()),
                "/adopt/admin/shelters");
        return ShelterDtoMapper.fromEntity(s);
    }

    /**
     * Returns the signed-in user's shelter row. Shelter organization accounts automatically get a pending shelter
     * stub on first access if none exists (legacy data or failed signup linkage), so they can complete the dossier.
     */
    @Transactional
    public Optional<ShelterDto> myShelter(SecurityUser principal) {
        Optional<Shelter> existing = shelterRepository.findByUserId(principal.getId());
        if (existing.isPresent()) {
            return Optional.of(ShelterDtoMapper.fromEntity(existing.get()));
        }
        if (principal.getUser().getAccountType() != UserAccountType.SHELTER) {
            return Optional.empty();
        }
        try {
            User user = userRepository.findById(principal.getId()).orElseThrow();
            Shelter s = Shelter.builder()
                    .user(user)
                    .name(defaultShelterNameForUser(user))
                    .status(ShelterStatus.PENDING)
                    .build();
            shelterRepository.saveAndFlush(s);
            return Optional.of(ShelterDtoMapper.fromEntity(s));
        } catch (DataIntegrityViolationException ex) {
            return shelterRepository.findByUserId(principal.getId()).map(ShelterDtoMapper::fromEntity);
        }
    }

    private static String defaultShelterNameForUser(User user) {
        String n = user.getDisplayName();
        if (n != null && !n.isBlank()) {
            return n.trim();
        }
        return "Shelter organization";
    }

    @Transactional
    public ShelterDto updateShelterProfile(ShelterProfileUpdateRequest req, SecurityUser principal) {
        requireShelterAccount(principal);
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        applyProfileRequest(s, req);
        s.setProfileLastSavedAt(Instant.now());
        Instant priorCompleted = s.getProfileCompletedAt();
        if (Boolean.TRUE.equals(req.markComplete())) {
            validateProfileComplete(s);
            s.setProfileCompletedAt(Instant.now());
            if (priorCompleted == null) {
                appNotificationService.publishToAdmins(
                        AppNotificationKind.ADMIN_SHELTER_DOSSIER_SUBMITTED,
                        "Shelter ready for verification",
                        String.format(
                                "%s submitted a complete shelter dossier. It is ready for admin verification.",
                                s.getName()),
                        "/adopt/admin/shelters/" + s.getId());
            }
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
    public AdoptionListingDto getListing(Long id, SecurityUser principal) {
        AdoptionListing l = adoptionListingRepository.findById(id).orElseThrow();
        boolean shelterOwner = principal != null && isShelterOwnerOfListing(principal, l);
        if (l.getShelter().getStatus() != ShelterStatus.APPROVED && !shelterOwner) {
            throw new IllegalStateException("Listing not available");
        }
        if (l.getStatus() != ListingStatus.ACTIVE && !shelterOwner) {
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
        return adoptionListingRepository.findByShelter_IdOrderByCreatedAtDesc(s.getId()).stream()
                .map(this::toAdoptionDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdoptionListingDto> mineArchiveListings(SecurityUser principal) {
        requireVerifiedShelterPublisher(principal);
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        return adoptionListingRepository.findByShelterIdAndStatusOrderByCreatedAtDesc(s.getId(), ListingStatus.SOLD)
                .stream()
                .map(this::toAdoptionDto)
                .toList();
    }

    @Transactional
    public AdoptionListingDto createListing(AdoptionListingUpsertRequest req, SecurityUser principal) {
        requireVerifiedShelterPublisher(principal);
        AdoptionListingTextValidator.rejectReason(req.title(), req.petName(), req.description(), req.breed())
                .ifPresent(msg -> {
                    throw new IllegalArgumentException(msg);
                });
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
        String petLabel = l.getPetName() != null && !l.getPetName().isBlank() ? l.getPetName().trim() : l.getTitle().trim();
        appNotificationService.publish(
                principal.getId(),
                AppNotificationKind.ADOPTION_LISTING_PUBLISHED,
                "Adoption listing is live",
                String.format("Your listing for %s is now visible to adopters on PawHub.", petLabel.replace("\"", "'")),
                "/adopt/" + l.getId(),
                "shelter",
                null);
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
        if (l.getStatus() != ListingStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot update a listing that is no longer active.");
        }
        if (aiCatCheckService.isCatCheckEnabled()) {
            com.pawhub.web.dto.CatCheckResponse cat =
                    aiCatCheckService.verifyAdoptionListingCatPhoto(photo.getBytes(), photo.getContentType());
            if (!cat.isCatRelated()) {
                throw new AiCatCheckService.CatCheckFailedException(cat.reason());
            }
        }
        l.setPhotoUrl(fileStorageService.store(photo, "adopt"));
        adoptionListingRepository.save(l);
        return toAdoptionDto(l);
    }

    @Transactional
    public Long inquire(Long listingId, SecurityUser principal) {
        if (principal.getUser().getRole() == UserRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Admin accounts cannot message shelters from Paw Adopt.");
        }
        AdoptionListing listing = adoptionListingRepository.findById(listingId).orElseThrow();
        if (listing.getShelter().getStatus() != ShelterStatus.APPROVED) {
            throw new IllegalStateException("Listing not available");
        }
        if (listing.getStatus() != ListingStatus.ACTIVE) {
            throw new IllegalStateException("Listing not available");
        }
        User shelterOwner = listing.getShelter().getUser();
        if (shelterOwner.getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Cannot inquire on own listing");
        }
        Optional<AdoptionInquiry> existing =
                adoptionInquiryRepository.findByAdoptionListingIdAndUserId(listingId, principal.getId());
        if (existing.isPresent()) {
            ChatThread t = existing.get().getThread();
            ensureAdoptionIntroMessage(listing, userRepository.getReferenceById(principal.getId()), shelterOwner, t);
            return t.getId();
        }
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
        ensureAdoptionIntroMessage(listing, inquirer, shelterOwner, thread);
        String petLabel = listing.getPetName() != null && !listing.getPetName().isBlank()
                ? "'" + listing.getPetName().trim() + "'"
                : "\"" + listing.getTitle().trim() + "\"";
        appNotificationService.publish(
                shelterOwner.getId(),
                AppNotificationKind.ADOPTION_INQUIRY,
                "New adoption inquiry",
                String.format(
                        "%s is asking about adopting %s and opened a message thread.",
                        inquirer.getDisplayName(),
                        petLabel),
                "/messages/" + thread.getId(),
                "message",
                inquirer.getAvatarUrl());
        appNotificationService.publish(
                inquirer.getId(),
                AppNotificationKind.ADOPTION_INQUIRY_SUBMITTED,
                "Inquiry sent",
                String.format(
                        "Your inquiry about %s was sent to %s. You can follow up in Messages.",
                        petLabel, listing.getShelter().getName()),
                "/messages/" + thread.getId(),
                "shelter",
                null);
        return inq.getThread().getId();
    }

    @Transactional
    public AdoptionListingDto markListingAdopted(long listingId, SecurityUser principal) {
        requireVerifiedShelterPublisher(principal);
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        AdoptionListing l = adoptionListingRepository.findById(listingId).orElseThrow();
        if (!l.getShelter().getId().equals(s.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your listing");
        }
        if (l.getStatus() != ListingStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only active listings can be marked adopted.");
        }
        l.setStatus(ListingStatus.SOLD);
        adoptionListingRepository.save(l);
        return toAdoptionDto(l);
    }

    /**
     * From an adoption message thread, the listing shelter records whether this adopter is taking the pet (confirms
     * listing) or the adoption is not going ahead (listing stays open unless already placed elsewhere).
     */
    @Transactional
    public void shelterSetInquiryOutcome(long threadId, String decision, SecurityUser principal) {
        requireVerifiedShelterPublisher(principal);
        if (!"CONFIRM".equalsIgnoreCase(decision) && !"DECLINE".equalsIgnoreCase(decision)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "decision must be CONFIRM or DECLINE");
        }
        boolean confirm = "CONFIRM".equalsIgnoreCase(decision);
        ChatThread thread =
                chatThreadRepository.findById(threadId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (thread.getType() != ThreadType.ADOPTION) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "This action only applies to adoption message threads.");
        }
        AdoptionInquiry inq = adoptionInquiryRepository
                .findByThread_Id(threadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Adoption inquiry not found."));
        if (inq.getOutcome() != AdoptionInquiryOutcome.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This inquiry was already updated.");
        }
        Shelter shelter = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        AdoptionListing listing = inq.getAdoptionListing();
        if (!listing.getShelter().getId().equals(shelter.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Only the listing shelter can record an adoption outcome here.");
        }
        User shelterUser = userRepository
                .findById(shelter.getUser().getId())
                .orElseThrow();
        User inquirer = inq.getUser();
        String petLabel = listing.getPetName() != null && !listing.getPetName().isBlank()
                ? listing.getPetName().trim()
                : listing.getTitle().trim();
        if (confirm) {
            if (listing.getStatus() != ListingStatus.ACTIVE) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "This pet is not listed as available — it may already be adopted. You can use Decline to close this inquiry for records.");
            }
            inq.setOutcome(AdoptionInquiryOutcome.CONFIRMED);
            listing.setStatus(ListingStatus.SOLD);
            adoptionInquiryRepository.save(inq);
            adoptionListingRepository.save(listing);
            String line = "Paw Adopt: "
                    + petLabel
                    + " is marked as adopted. Thank you for completing this placement.";
            chatService.postAdoptionStatusLine(threadId, shelterUser.getId(), line);
            appNotificationService.publishWithInboxNudge(
                    inquirer.getId(),
                    AppNotificationKind.ADOPTION_INQUIRY_OUTCOME_ADOPTED,
                    "Adoption complete",
                    String.format(
                            "%s marked %s as adopted — the listing is closed. Open Messages to celebrate.",
                            shelter.getName() != null ? shelter.getName() : "The shelter", petLabel),
                    "/messages/" + threadId,
                    "shelter",
                    shelterUser.getAvatarUrl());
        } else {
            inq.setOutcome(AdoptionInquiryOutcome.DECLINED);
            adoptionInquiryRepository.save(inq);
            String line =
                    "Paw Adopt: the shelter has noted that this placement is not going ahead with this inquiry. The adoption"
                            + " did not go through; the pet may still be available for a different home (check the"
                            + " listing).";
            chatService.postAdoptionStatusLine(threadId, shelterUser.getId(), line);
            appNotificationService.publishWithInboxNudge(
                    inquirer.getId(),
                    AppNotificationKind.ADOPTION_INQUIRY_OUTCOME_DECLINED,
                    "Inquiry update",
                    String.format(
                            "%s updated the adoption for %s — the shelter indicated this home did not go ahead.",
                            shelter.getName() != null ? shelter.getName() : "The shelter", petLabel),
                    "/messages/" + threadId,
                    "shelter",
                    shelterUser.getAvatarUrl());
        }
    }

    @Transactional
    public void deleteAdoptedListing(long listingId, SecurityUser principal) {
        requireVerifiedShelterPublisher(principal);
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        AdoptionListing l = adoptionListingRepository.findById(listingId).orElseThrow();
        if (!l.getShelter().getId().equals(s.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your listing");
        }
        if (l.getStatus() != ListingStatus.SOLD) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only adopted listings can be removed. Mark the cat as adopted first, then delete.");
        }
        adoptionListingRepository.delete(l);
    }

    @Transactional
    public ShelterDto submitShelterAppeal(SubmitShelterAppealRequest req, SecurityUser principal) {
        requireShelterAccount(principal);
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        if (s.getStatus() != ShelterStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only rejected applications can submit an appeal.");
        }
        if (s.getAppealState() == ShelterAppealState.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a pending appeal.");
        }
        if (s.getAppealState() == ShelterAppealState.REJECTED_FINAL) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Appeals are not available for this application.");
        }
        s.setAppealMessage(req.message().trim());
        s.setAppealSubmittedAt(Instant.now());
        s.setAppealState(ShelterAppealState.PENDING);
        shelterRepository.save(s);
        appNotificationService.publishToAdmins(
                AppNotificationKind.ADMIN_SHELTER_APPEAL_PENDING,
                "Shelter appeal submitted",
                String.format("%s submitted an appeal after rejection. Review in the shelter queue.", s.getName()),
                "/adopt/admin/shelters/" + s.getId());
        return ShelterDtoMapper.fromEntity(s);
    }

    @Transactional(readOnly = true)
    public List<AdoptionListingDto> adminListAdoptionListingsForShelter(long shelterId) {
        if (!shelterRepository.existsById(shelterId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Shelter not found: " + shelterId);
        }
        return adoptionListingRepository.findByShelter_IdOrderByCreatedAtDesc(shelterId).stream()
                .map(this::toAdoptionDto)
                .toList();
    }

    @Transactional
    public void adminRemoveAdoptionListing(
            long listingId, AdminRemoveAdoptionListingRequest req, SecurityUser admin) {
        AdminRemoveAdoptionListingRequest body = req != null ? req : AdminRemoveAdoptionListingRequest.defaults();
        AdoptionListing l = adoptionListingRepository
                .findById(listingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        User shelterUser = userRepository.findById(l.getShelter().getUser().getId()).orElseThrow();
        Long shelterOwnerId = shelterUser.getId();

        String petTitle = l.getPetName() != null && !l.getPetName().isBlank()
                ? l.getPetName().trim()
                : l.getTitle().trim();
        String titleShort = petTitle.length() > 120 ? petTitle.substring(0, 117) + "…" : petTitle;

        String reason = body.reason() != null && !body.reason().isBlank()
                ? body.reason().trim()
                : "No reason was provided.";
        String reasonShort = reason.length() > 800 ? reason.substring(0, 797) + "…" : reason;

        User adminUser = userRepository.findById(admin.getId()).orElseThrow();
        List<AdoptionInquiry> inquiries = adoptionInquiryRepository.findByAdoptionListing_Id(listingId);
        String adminMsg = "⚠️ Moderation: The adoption listing \""
                + titleShort.replace("\"", "'")
                + "\" was removed.\nReason: "
                + reasonShort;
        Set<Long> postedThreads = new HashSet<>();
        for (AdoptionInquiry inq : inquiries) {
            ChatThread t = inq.getThread();
            if (!postedThreads.add(t.getId())) {
                continue;
            }
            Message m = messageRepository.save(Message.builder()
                    .thread(t)
                    .sender(adminUser)
                    .body(adminMsg)
                    .build());
            MessageDto dto = new MessageDto(
                    m.getId(),
                    adminUser.getId(),
                    m.getBody(),
                    m.getCreatedAt(),
                    m.getAttachmentUrl());
            messagingTemplate.convertAndSend("/topic/threads." + t.getId(), dto);
        }

        adoptionListingRepository.delete(l);

        String notifBody = "Your adoption listing \""
                + titleShort.replace("\"", "'")
                + "\" was removed by an administrator. Reason: "
                + reasonShort;
        appNotificationService.publishWithInboxNudge(
                shelterOwnerId,
                AppNotificationKind.ADOPTION_LISTING_REMOVED_ADMIN,
                "Adoption listing removed by admin",
                notifBody,
                "/adopt/shelter",
                "shelter",
                null);

        if (body.warnShelter()) {
            appNotificationService.publishWithInboxNudge(
                    shelterOwnerId,
                    AppNotificationKind.ADMIN_PAW_ADOPT_SHELTER_WARNED,
                    "Paw Adopt warning",
                    "A moderator issued a warning related to your Paw Adopt listings. Reason: " + reasonShort,
                    "/adopt/shelter",
                    "urgent",
                    null);
        }
        if (body.banShelter()) {
            shelterUser.setPawAdoptBanned(true);
            userRepository.save(shelterUser);
            appNotificationService.publishWithInboxNudge(
                    shelterOwnerId,
                    AppNotificationKind.ADMIN_PAW_ADOPT_SHELTER_BANNED,
                    "Banned from Paw Adopt listings",
                    "Your account can no longer publish or manage adoption listings on Paw Adopt. Reason: " + reasonShort,
                    "/adopt/shelter",
                    "urgent",
                    null);
        }
    }

    private void ensureAdoptionIntroMessage(
            AdoptionListing listing, User inquirer, User shelterOwner, ChatThread thread) {
        if (messageRepository.countByThreadId(thread.getId()) > 0) {
            return;
        }
        String listingUrl = pawhubProperties.adoptionListingPageUrl(listing.getId());
        String petTitle = listing.getPetName() != null && !listing.getPetName().isBlank()
                ? listing.getPetName().trim()
                : listing.getTitle().trim();
        String intro = String.format(
                "\uD83D\uDC3E %s is asking about adopting %s and wants to learn more.\n\nView adoption listing: %s",
                inquirer.getDisplayName(), petTitle, listingUrl);
        Message msg = Message.builder()
                .thread(thread)
                .sender(inquirer)
                .body(intro)
                .build();
        messageRepository.save(msg);
        MessageDto dto = new MessageDto(
                msg.getId(), inquirer.getId(), msg.getBody(), msg.getCreatedAt(), msg.getAttachmentUrl());
        messagingTemplate.convertAndSend("/topic/threads." + thread.getId(), dto);
    }

    private boolean isShelterOwnerOfListing(SecurityUser principal, AdoptionListing l) {
        if (principal.getUser().getAccountType() != UserAccountType.SHELTER) {
            return false;
        }
        return shelterRepository
                .findByUserId(principal.getId())
                .map(shelter -> shelter.getId().equals(l.getShelter().getId()))
                .orElse(false);
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
        var sh = l.getShelter();
        return new AdoptionListingDto(
                l.getId(),
                sh.getId(),
                l.getTitle(),
                l.getPetName(),
                l.getDescription(),
                l.getBreed(),
                l.getAgeMonths(),
                l.getPhotoUrl(),
                l.getStatus().name(),
                adoptionShelterPartnerDisplayName(sh),
                sh.getUser().getId(),
                sh.getUser().getAvatarUrl());
    }

    /**
     * Label shown as the listing’s “shelter partner”: the signed-in shelter account’s display name first, so bogus
     * or placeholder {@link Shelter#getName()} rows (e.g. “1 1”) don’t replace the real Paw Adopt profile name.
     */
    private static String adoptionShelterPartnerDisplayName(Shelter sh) {
        String account = sh.getUser().getDisplayName();
        if (account != null && !account.isBlank()) {
            return account.trim();
        }
        String org = sh.getName();
        if (org != null && !org.isBlank()) {
            return org.trim();
        }
        return "Shelter";
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
        if (principal.getUser().getRole() != UserRole.ADMIN) {
            User publisher = userRepository.findById(principal.getId()).orElseThrow();
            if (publisher.isPawAdoptBanned()) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Your account cannot publish or manage adoption listings on Paw Adopt.");
            }
        }
    }
}
