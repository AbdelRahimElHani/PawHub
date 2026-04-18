package com.pawhub.service;

import com.pawhub.domain.*;
import com.pawhub.repository.*;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.AdoptionListingDto;
import java.util.Optional;
import com.pawhub.web.dto.AdoptionListingUpsertRequest;
import com.pawhub.web.dto.ShelterDto;
import com.pawhub.web.dto.ShelterUpsertRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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
        return toShelterDto(s);
    }

    public Optional<ShelterDto> myShelter(SecurityUser principal) {
        return shelterRepository.findByUserId(principal.getId()).map(this::toShelterDto);
    }

    public AdoptionListingDto getListing(Long id) {
        AdoptionListing l = adoptionListingRepository.findById(id).orElseThrow();
        if (l.getShelter().getStatus() != ShelterStatus.APPROVED || l.getStatus() != ListingStatus.ACTIVE) {
            throw new IllegalStateException("Listing not available");
        }
        return toAdoptionDto(l);
    }

    public List<AdoptionListingDto> browse() {
        return adoptionListingRepository.findByStatusOrderByCreatedAtDesc(ListingStatus.ACTIVE).stream()
                .filter(l -> l.getShelter().getStatus() == ShelterStatus.APPROVED)
                .map(this::toAdoptionDto)
                .toList();
    }

    public List<AdoptionListingDto> mineListings(SecurityUser principal) {
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        if (s.getStatus() != ShelterStatus.APPROVED) {
            throw new IllegalStateException("Shelter not approved");
        }
        return adoptionListingRepository.findByShelterIdAndStatusOrderByCreatedAtDesc(s.getId(), ListingStatus.ACTIVE)
                .stream()
                .map(this::toAdoptionDto)
                .toList();
    }

    @Transactional
    public AdoptionListingDto createListing(AdoptionListingUpsertRequest req, SecurityUser principal) {
        Shelter s = shelterRepository.findByUserId(principal.getId()).orElseThrow();
        if (s.getStatus() != ShelterStatus.APPROVED) {
            throw new IllegalStateException("Shelter not approved");
        }
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
        AdoptionListing l = adoptionListingRepository.findById(listingId).orElseThrow();
        if (!l.getShelter().getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Not your listing");
        }
        l.setPhotoUrl(fileStorageService.store(photo, "adopt"));
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

    private ShelterDto toShelterDto(Shelter s) {
        return new ShelterDto(
                s.getId(),
                s.getUser().getId(),
                s.getName(),
                s.getCity(),
                s.getRegion(),
                s.getPhone(),
                s.getEmailContact(),
                s.getBio(),
                s.getStatus().name());
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
}
