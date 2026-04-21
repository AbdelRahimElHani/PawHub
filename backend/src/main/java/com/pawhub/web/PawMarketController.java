package com.pawhub.web;

import com.pawhub.security.SecurityUser;
import com.pawhub.service.AiCatCheckService;
import com.pawhub.service.PawMarketService;
import com.pawhub.web.dto.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/paw")
@RequiredArgsConstructor
public class PawMarketController {

    private final PawMarketService pawMarketService;
    private final AiCatCheckService aiCatCheckService;

    // ── AI Cat-Check (image-based) ────────────────────────────────────────

    /**
     * Accepts a product image plus optional title/description. Gemini checks that the photo is
     * cat-related and that the text matches the photo and each other. Returns {isCatRelated, reason}.
     */
    @PostMapping(value = "/cat-check", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CatCheckResponse catCheck(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description) throws Exception {
        return aiCatCheckService.verifyImage(
                file.getBytes(), file.getContentType(), title, description);
    }

    // ── Listings ──────────────────────────────────────────────────────────

    @GetMapping("/listings")
    public List<PawListingDto> browse(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean isFree,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String region,
            @AuthenticationPrincipal SecurityUser user) {
        Long excludeSellerId = user != null ? user.getId() : null;
        return pawMarketService.browse(category, isFree, city, region, excludeSellerId);
    }

    @GetMapping("/listings/mine")
    public List<PawListingDto> mine(@AuthenticationPrincipal SecurityUser user) {
        return pawMarketService.mine(user);
    }

    @GetMapping("/listings/{id}")
    public PawListingDto get(@PathVariable Long id) {
        return pawMarketService.get(id);
    }

    @PostMapping("/listings")
    @ResponseStatus(HttpStatus.CREATED)
    public PawListingDto create(
            @Valid @RequestBody PawListingUpsertRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        return pawMarketService.create(req, user);
    }

    @PutMapping("/listings/{id}")
    public PawListingDto update(
            @PathVariable Long id,
            @Valid @RequestBody PawListingUpsertRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        return pawMarketService.update(id, req, user);
    }

    @DeleteMapping("/listings/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteListing(@PathVariable Long id, @AuthenticationPrincipal SecurityUser user) {
        pawMarketService.deleteListing(id, user);
    }

    /** Seller: mark listing sold off-platform; keeps the row for your history (no delete). */
    @PostMapping("/listings/{id}/sold-off-market")
    public PawListingDto markSoldOffMarket(
            @PathVariable Long id, @AuthenticationPrincipal SecurityUser user) {
        return pawMarketService.markSoldOffMarket(id, user);
    }

    @PostMapping(value = "/listings/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PawListingDto uploadPhoto(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal SecurityUser user)
            throws Exception {
        return pawMarketService.uploadPhoto(id, file, user);
    }

    // ── Buy flow ──────────────────────────────────────────────────────────

    @PostMapping("/listings/{id}/buy")
    public ResponseEntity<?> placeOrder(
            @PathVariable Long id,
            @Valid @RequestBody PlaceOrderRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        try {
            return ResponseEntity.ok(pawMarketService.placeOrder(id, req, user));
        } catch (IllegalStateException | IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // ── Reviews ───────────────────────────────────────────────────────────

    @PostMapping("/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public PawReviewDto submitReview(
            @Valid @RequestBody PawReviewRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        return pawMarketService.submitReview(req, user);
    }

    @GetMapping("/users/{userId}/reviews")
    public List<PawReviewDto> getReviews(@PathVariable Long userId) {
        return pawMarketService.getReviews(userId);
    }
}
