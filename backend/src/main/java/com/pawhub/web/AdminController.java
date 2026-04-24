package com.pawhub.web;

import com.pawhub.service.AdminShelterService;
import com.pawhub.service.AdminVetLicenseService;
import com.pawhub.service.AppNotificationService;
import com.pawhub.service.PawvetConsultationReviewService;
import com.pawhub.web.dto.BroadcastNotificationRequest;
import com.pawhub.web.dto.RejectVetApplicationRequest;
import com.pawhub.web.dto.ShelterDto;
import com.pawhub.web.dto.VetAccountReviewsAdminDto;
import com.pawhub.web.dto.VetApplicationMetricsDto;
import com.pawhub.web.dto.VetLicenseApplicationAdminDto;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminShelterService adminShelterService;
    private final AdminVetLicenseService adminVetLicenseService;
    private final PawvetConsultationReviewService pawvetConsultationReviewService;
    private final AppNotificationService appNotificationService;

    @GetMapping("/shelters/pending")
    public List<ShelterDto> pendingSubmissions() {
        return adminShelterService.pendingSubmissions();
    }

    @GetMapping("/shelters/{id}")
    public ShelterDto getShelter(@PathVariable Long id) {
        return adminShelterService.getShelter(id);
    }

    @PostMapping("/shelters/{id}/approve")
    public ShelterDto approve(@PathVariable Long id) {
        return adminShelterService.approve(id);
    }

    @PostMapping("/shelters/{id}/reject")
    public ShelterDto reject(@PathVariable Long id) {
        return adminShelterService.reject(id);
    }

    @GetMapping("/vet-applications/metrics")
    public VetApplicationMetricsDto vetApplicationMetrics() {
        return adminVetLicenseService.metrics();
    }

    @GetMapping("/vet-applications/pending")
    public List<VetLicenseApplicationAdminDto> vetApplicationsPending() {
        return adminVetLicenseService.pending();
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

    @GetMapping("/pawvet/vet-accounts-with-reviews")
    public List<VetAccountReviewsAdminDto> vetAccountsWithReviews() {
        return pawvetConsultationReviewService.listAllVetAccountsWithReviewsForAdmin();
    }

    @PostMapping("/notifications/broadcast")
    public BroadcastResult broadcastNotification(@Valid @RequestBody BroadcastNotificationRequest req) {
        int n = appNotificationService.broadcastSystemAnnouncement(req.title(), req.body(), req.deepLink());
        return new BroadcastResult(n);
    }

    public record BroadcastResult(int recipients) {}
}
