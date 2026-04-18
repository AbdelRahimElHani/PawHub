package com.pawhub.web;

import com.pawhub.service.AdoptionService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.AdoptionListingDto;
import com.pawhub.web.dto.AdoptionListingUpsertRequest;
import com.pawhub.web.dto.ShelterDto;
import com.pawhub.web.dto.ShelterUpsertRequest;
import com.pawhub.web.dto.ThreadIdResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/adopt")
@RequiredArgsConstructor
public class AdoptionController {

    private final AdoptionService adoptionService;

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

    @GetMapping("/listings")
    public List<AdoptionListingDto> browse() {
        return adoptionService.browse();
    }

    @GetMapping("/listings/{id}")
    public AdoptionListingDto getListing(@PathVariable Long id) {
        return adoptionService.getListing(id);
    }

    @GetMapping("/listings/mine")
    public List<AdoptionListingDto> mineListings(@AuthenticationPrincipal SecurityUser user) {
        return adoptionService.mineListings(user);
    }

    @PostMapping("/listings")
    public AdoptionListingDto createListing(
            @Valid @RequestBody AdoptionListingUpsertRequest req, @AuthenticationPrincipal SecurityUser user) {
        return adoptionService.createListing(req, user);
    }

    @PostMapping(value = "/listings/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AdoptionListingDto uploadPhoto(
            @PathVariable Long id, @RequestPart("file") MultipartFile file, @AuthenticationPrincipal SecurityUser user)
            throws Exception {
        return adoptionService.uploadListingPhoto(id, file, user);
    }

    @PostMapping("/listings/{id}/inquire")
    public ThreadIdResponse inquire(@PathVariable Long id, @AuthenticationPrincipal SecurityUser user) {
        return new ThreadIdResponse(adoptionService.inquire(id, user));
    }
}
