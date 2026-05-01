package com.pawhub.web;

import com.pawhub.domain.ShelterStatus;
import com.pawhub.domain.VetVerificationStatus;
import com.pawhub.service.AdoptionService;
import com.pawhub.service.AdminShelterService;
import com.pawhub.service.AdminVetLicenseService;
import com.pawhub.service.AppNotificationService;
import com.pawhub.service.PawvetConsultationReviewService;
import com.pawhub.service.PawvetTriageCaseService;
import com.pawhub.web.dto.AdoptionListingDto;
import com.pawhub.web.dto.BroadcastNotificationRequest;
import com.pawhub.web.dto.PawvetVetReportAdminDto;
import com.pawhub.web.dto.RejectShelterAppealRequest;
import com.pawhub.web.dto.RejectShelterApplicationRequest;
import com.pawhub.web.dto.RejectVetAppealRequest;
import com.pawhub.web.dto.RejectVetApplicationRequest;
import com.pawhub.web.dto.ShelterDto;
import com.pawhub.web.dto.VetAccountReviewsAdminDto;
import com.pawhub.web.dto.VetApplicationMetricsDto;
import com.pawhub.web.dto.VetLicenseApplicationAdminDto;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdoptionService adoptionService;
    private final AdminShelterService adminShelterService;
    private final AdminVetLicenseService adminVetLicenseService;
    private final PawvetConsultationReviewService pawvetConsultationReviewService;
    private final PawvetTriageCaseService pawvetTriageCaseService;
    private final AppNotificationService appNotificationService;

    @GetMapping("/shelters/pending")
    public List<ShelterDto> pendingSubmissions() {
        return adminShelterService.pendingSubmissions();
    }

    @GetMapping("/shelters/by-status")
    public List<ShelterDto> sheltersByStatus(@RequestParam String status) {
        return adminShelterService.byStatus(parseShelterStatus(status));
    }

    @GetMapping("/shelters/appeals-pending")
    public List<ShelterDto> shelterAppealsPending() {
        return adminShelterService.appealsPending();
    }

    @GetMapping("/shelters/{id}")
    public ShelterDto getShelter(@PathVariable Long id) {
        return adminShelterService.getShelter(id);
    }

    @GetMapping("/shelters/{id}/adoption-listings")
    public List<AdoptionListingDto> shelterAdoptionListings(@PathVariable Long id) {
        return adoptionService.adminListAdoptionListingsForShelter(id);
    }

    @DeleteMapping("/adopt/listings/{listingId}")
    public void adminDeleteAdoptionListing(@PathVariable long listingId) {
        adoptionService.adminRemoveAdoptionListing(listingId);
    }

    @PostMapping("/shelters/{id}/approve")
    public ShelterDto approve(@PathVariable Long id) {
        return adminShelterService.approve(id);
    }

    @PostMapping("/shelters/{id}/reject")
    public ShelterDto reject(
            @PathVariable Long id, @RequestBody(required = false) RejectShelterApplicationRequest req) {
        return adminShelterService.reject(id, req);
    }

    @PostMapping("/shelters/{id}/appeal/accept")
    public ShelterDto shelterAppealAccept(@PathVariable Long id) {
        return adminShelterService.acceptAppeal(id);
    }

    @PostMapping("/shelters/{id}/appeal/reject")
    public ShelterDto shelterAppealReject(
            @PathVariable Long id, @RequestBody(required = false) RejectShelterAppealRequest req) {
        return adminShelterService.rejectAppeal(id, req);
    }

    @PostMapping("/shelters/{id}/revoke-verification")
    public ShelterDto revokeShelterVerification(@PathVariable Long id) {
        return adminShelterService.revokeVerification(id);
    }

    @GetMapping("/vet-applications/metrics")
    public VetApplicationMetricsDto vetApplicationMetrics() {
        return adminVetLicenseService.metrics();
    }

    @GetMapping("/vet-applications/pending")
    public List<VetLicenseApplicationAdminDto> vetApplicationsPending() {
        return adminVetLicenseService.pending();
    }

    @GetMapping("/vet-applications/by-status")
    public List<VetLicenseApplicationAdminDto> vetApplicationsByStatus(@RequestParam String status) {
        return adminVetLicenseService.byStatus(parseVetVerificationStatus(status));
    }

    @GetMapping("/vet-applications/appeals-pending")
    public List<VetLicenseApplicationAdminDto> vetApplicationAppealsPending() {
        return adminVetLicenseService.appealsPending();
    }

    @PostMapping("/vet-applications/{id}/approve")
    public VetLicenseApplicationAdminDto vetApplicationApprove(@PathVariable Long id) {
        return adminVetLicenseService.approve(id);
    }

    @PostMapping("/vet-applications/{id}/reject")
    public VetLicenseApplicationAdminDto vetApplicationReject(
            @PathVariable Long id, @Valid @RequestBody RejectVetApplicationRequest req) {
        return adminVetLicenseService.reject(id, req);
    }

    @PostMapping("/vet-applications/{id}/appeal/accept")
    public VetLicenseApplicationAdminDto vetApplicationAcceptAppeal(@PathVariable Long id) {
        return adminVetLicenseService.acceptAppeal(id);
    }

    @PostMapping("/vet-applications/{id}/appeal/reject")
    public VetLicenseApplicationAdminDto vetApplicationRejectAppeal(
            @PathVariable Long id, @RequestBody(required = false) RejectVetAppealRequest req) {
        return adminVetLicenseService.rejectAppeal(id, req);
    }

    @PostMapping("/vet-accounts/{userId}/revoke-credentials")
    public void revokeVetCredentials(@PathVariable Long userId) {
        pawvetConsultationReviewService.revokeVeterinarianCredentials(userId);
    }

    @GetMapping("/pawvet/vet-accounts-with-reviews")
    public List<VetAccountReviewsAdminDto> vetAccountsWithReviews() {
        return pawvetConsultationReviewService.listAllVetAccountsWithReviewsForAdmin();
    }

    @GetMapping("/pawvet/vet-reports")
    public List<PawvetVetReportAdminDto> pawvetVetReports() {
        return pawvetTriageCaseService.listVetReportsForAdmin();
    }

    @PostMapping("/notifications/broadcast")
    public BroadcastResult broadcastNotification(@Valid @RequestBody BroadcastNotificationRequest req) {
        int n = appNotificationService.broadcastSystemAnnouncement(req.title(), req.body(), req.deepLink());
        return new BroadcastResult(n);
    }

    public record BroadcastResult(int recipients) {}

    private static VetVerificationStatus parseVetVerificationStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status is required");
        }
        try {
            return VetVerificationStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid vet application status.");
        }
    }

    private static ShelterStatus parseShelterStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status is required");
        }
        try {
            return ShelterStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid shelter status.");
        }
    }
}
