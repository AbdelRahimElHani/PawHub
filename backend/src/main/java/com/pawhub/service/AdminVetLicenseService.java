package com.pawhub.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawhub.domain.AppNotificationKind;
import com.pawhub.domain.VetAppealState;
import com.pawhub.domain.VetLicenseApplication;
import com.pawhub.domain.VetVerificationStatus;
import com.pawhub.repository.VetLicenseApplicationRepository;
import com.pawhub.web.dto.RejectVetApplicationRequest;
import com.pawhub.web.dto.RejectVetAppealRequest;
import com.pawhub.web.dto.VetApplicationMetricsDto;
import com.pawhub.web.dto.VetLicenseApplicationAdminDto;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AdminVetLicenseService {

    private final VetLicenseApplicationRepository vetLicenseApplicationRepository;
    private final ObjectMapper objectMapper;
    private final AppNotificationService appNotificationService;

    @Transactional(readOnly = true)
    public VetApplicationMetricsDto metrics() {
        long total = vetLicenseApplicationRepository.count();
        long pending = vetLicenseApplicationRepository.countByStatus(VetVerificationStatus.PENDING);
        long approved = vetLicenseApplicationRepository.countByStatus(VetVerificationStatus.APPROVED);
        long rejected = vetLicenseApplicationRepository.countByStatus(VetVerificationStatus.REJECTED);
        return new VetApplicationMetricsDto(total, pending, approved, rejected);
    }

    @Transactional(readOnly = true)
    public List<VetLicenseApplicationAdminDto> pending() {
        return vetLicenseApplicationRepository.findByStatusOrderByCreatedAtAsc(VetVerificationStatus.PENDING).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<VetLicenseApplicationAdminDto> byStatus(VetVerificationStatus status) {
        return vetLicenseApplicationRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<VetLicenseApplicationAdminDto> appealsPending() {
        return vetLicenseApplicationRepository.findByAppealStateOrderByAppealSubmittedAtAsc(VetAppealState.PENDING).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public VetLicenseApplicationAdminDto approve(Long applicationId) {
        VetLicenseApplication a = vetLicenseApplicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        requirePending(a);
        a.setStatus(VetVerificationStatus.APPROVED);
        a.setRejectionReason(null);
        a.setAppealMessage(null);
        a.setAppealSubmittedAt(null);
        a.setAppealState(null);
        vetLicenseApplicationRepository.save(a);
        String lic = a.getLicenseNumber() != null ? a.getLicenseNumber() : "your license";
        appNotificationService.publish(
                a.getUser().getId(),
                AppNotificationKind.VET_LICENSE_VERIFIED,
                "License verified",
                String.format("License #%s verified. You can now claim health cases.", lic),
                "/vet",
                "vet",
                null);
        return toDto(a);
    }

    @Transactional
    public VetLicenseApplicationAdminDto reject(Long applicationId, RejectVetApplicationRequest req) {
        VetLicenseApplication a = vetLicenseApplicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        requirePending(a);
        a.setStatus(VetVerificationStatus.REJECTED);
        a.setRejectionReason(req.reason().trim());
        a.setAppealMessage(null);
        a.setAppealSubmittedAt(null);
        a.setAppealState(null);
        return toDto(vetLicenseApplicationRepository.save(a));
    }

    @Transactional
    public VetLicenseApplicationAdminDto acceptAppeal(Long applicationId) {
        VetLicenseApplication a = vetLicenseApplicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        if (a.getStatus() != VetVerificationStatus.REJECTED || a.getAppealState() != VetAppealState.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This application has no pending appeal to accept.");
        }
        a.setStatus(VetVerificationStatus.PENDING);
        a.setRejectionReason(null);
        a.setAppealMessage(null);
        a.setAppealSubmittedAt(null);
        a.setAppealState(null);
        vetLicenseApplicationRepository.save(a);
        appNotificationService.publishWithInboxNudge(
                a.getUser().getId(),
                AppNotificationKind.VET_LICENSE_VERIFIED,
                "Appeal accepted",
                "Your appeal was accepted. Your license application is back in the review queue.",
                "/vet",
                "vet",
                null);
        return toDto(a);
    }

    @Transactional
    public VetLicenseApplicationAdminDto rejectAppeal(Long applicationId, RejectVetAppealRequest req) {
        VetLicenseApplication a = vetLicenseApplicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        if (a.getAppealState() != VetAppealState.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This application has no pending appeal.");
        }
        a.setAppealState(VetAppealState.REJECTED_FINAL);
        String extra = req != null && req.reason() != null && !req.reason().isBlank()
                ? " Admin note: " + req.reason().trim()
                : "";
        appNotificationService.publishWithInboxNudge(
                a.getUser().getId(),
                AppNotificationKind.SYSTEM_ANNOUNCEMENT,
                "Appeal not accepted",
                "Your appeal was reviewed and was not accepted. You cannot submit another appeal for this decision."
                    + extra,
                "/vet",
                "system",
                null);
        return toDto(vetLicenseApplicationRepository.save(a));
    }

    private static void requirePending(VetLicenseApplication a) {
        if (a.getStatus() != VetVerificationStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Application is not pending (status: " + a.getStatus() + ").");
        }
    }

    private VetLicenseApplicationAdminDto toDto(VetLicenseApplication a) {
        var u = a.getUser();
        List<String> docUrls = parseSupportingUrls(a.getSupportingDocumentUrls());
        return new VetLicenseApplicationAdminDto(
                a.getId(),
                u.getId(),
                u.getEmail(),
                u.getDisplayName(),
                u.getAvatarUrl(),
                a.getLicenseNumber(),
                a.getUniversity(),
                a.getYearsExperience(),
                a.getPhone(),
                a.getProfessionalBio(),
                a.getStatus().name(),
                a.getRejectionReason(),
                a.getCreatedAt(),
                docUrls,
                a.getAppealMessage(),
                a.getAppealSubmittedAt(),
                a.getAppealState() != null ? a.getAppealState().name() : null);
    }

    private List<String> parseSupportingUrls(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
