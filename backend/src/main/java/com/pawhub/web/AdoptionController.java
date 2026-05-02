package com.pawhub.web;

import com.pawhub.service.AdoptionService;
import com.pawhub.service.AiCatCheckService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.AdoptionListingDto;
import com.pawhub.web.dto.AdoptionListingUpsertRequest;
import com.pawhub.web.dto.CatCheckResponse;
import com.pawhub.web.dto.ShelterDocumentKind;
import com.pawhub.web.dto.ShelterDto;
import com.pawhub.web.dto.ShelterProfileUpdateRequest;
import com.pawhub.web.dto.ShelterAdoptionOutcomeRequest;
import com.pawhub.web.dto.ShelterUpsertRequest;
import com.pawhub.web.dto.SubmitShelterAppealRequest;
import com.pawhub.web.dto.ThreadIdResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/adopt")
@RequiredArgsConstructor
public class AdoptionController {

    private final AdoptionService adoptionService;
    private final AiCatCheckService aiCatCheckService;

    /** Preview: adoption hero photo must show a real cat (same Gemini path as {@link AdoptionService#uploadListingPhoto}). */
    @PostMapping(value = "/cat-check-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CatCheckResponse adoptCatCheckImage(@RequestPart("file") MultipartFile file) throws Exception {
        return aiCatCheckService.verifyAdoptionListingCatPhoto(file.getBytes(), file.getContentType());
    }

    @PostMapping("/shelters")
    public ShelterDto apply(@Valid @RequestBody ShelterUpsertRequest req, @AuthenticationPrincipal SecurityUser user) {
        return adoptionService.applyShelter(req, user);
    }

    @GetMapping("/shelters/mine")
    public ResponseEntity<ShelterDto> mineShelter(@AuthenticationPrincipal SecurityUser user) {
        return adoptionService
                .myShelter(user)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/shelters/mine/profile")
    public ShelterDto updateShelterProfile(
            @Valid @RequestBody ShelterProfileUpdateRequest req, @AuthenticationPrincipal SecurityUser user) {
        return adoptionService.updateShelterProfile(req, user);
    }

    @PostMapping("/shelters/mine/appeal")
    public ShelterDto submitShelterAppeal(
            @Valid @RequestBody SubmitShelterAppealRequest req, @AuthenticationPrincipal SecurityUser user) {
        return adoptionService.submitShelterAppeal(req, user);
    }

    @PostMapping(value = "/shelters/mine/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ShelterDto uploadShelterDocument(
            @RequestParam ShelterDocumentKind kind,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal SecurityUser user)
            throws Exception {
        return adoptionService.uploadShelterDocument(kind, file, user);
    }

    @GetMapping("/listings")
    public List<AdoptionListingDto> browse() {
        return adoptionService.browse();
    }

    @GetMapping("/listings/{id}")
    public AdoptionListingDto getListing(@PathVariable Long id, Authentication authentication) {
        SecurityUser user = null;
        if (authentication != null && authentication.getPrincipal() instanceof SecurityUser su) {
            user = su;
        }
        return adoptionService.getListing(id, user);
    }

    @GetMapping("/listings/mine")
    public List<AdoptionListingDto> mineListings(@AuthenticationPrincipal SecurityUser user) {
        return adoptionService.mineListings(user);
    }

    @GetMapping("/listings/mine/archive")
    public List<AdoptionListingDto> mineArchiveListings(@AuthenticationPrincipal SecurityUser user) {
        return adoptionService.mineArchiveListings(user);
    }

    @PostMapping("/listings")
    public AdoptionListingDto createListing(
            @Valid @RequestBody AdoptionListingUpsertRequest req, @AuthenticationPrincipal SecurityUser user) {
        return adoptionService.createListing(req, user);
    }

    @PostMapping(value = "/listings/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AdoptionListingDto uploadPhoto(
            @PathVariable Long id, @RequestParam("file") MultipartFile file, @AuthenticationPrincipal SecurityUser user)
            throws Exception {
        return adoptionService.uploadListingPhoto(id, file, user);
    }

    @PostMapping("/listings/{id}/inquire")
    public ThreadIdResponse inquire(@PathVariable Long id, @AuthenticationPrincipal SecurityUser user) {
        return new ThreadIdResponse(adoptionService.inquire(id, user), false);
    }

    /**
     * In an adoption thread, the listing shelter records whether the placement with that adopter is complete
     * (mark adopted + close listing) or did not go ahead (inquirer is notified; listing can stay up).
     */
    @PostMapping("/inquiries/threads/{threadId}/shelter-outcome")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void shelterInquiryOutcome(
            @PathVariable long threadId,
            @Valid @RequestBody ShelterAdoptionOutcomeRequest body,
            @AuthenticationPrincipal SecurityUser user) {
        adoptionService.shelterSetInquiryOutcome(threadId, body.decision(), user);
    }

    @PostMapping("/listings/{id}/mark-adopted")
    public AdoptionListingDto markAdopted(@PathVariable long id, @AuthenticationPrincipal SecurityUser user) {
        return adoptionService.markListingAdopted(id, user);
    }

    @DeleteMapping("/listings/{id}")
    public ResponseEntity<Void> deleteListing(@PathVariable long id, @AuthenticationPrincipal SecurityUser user) {
        adoptionService.deleteAdoptedListing(id, user);
        return ResponseEntity.noContent().build();
    }
}
