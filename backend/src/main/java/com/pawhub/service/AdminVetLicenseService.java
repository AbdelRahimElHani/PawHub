package com.pawhub.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawhub.domain.VetLicenseApplication;
import com.pawhub.domain.VetVerificationStatus;
import com.pawhub.repository.VetLicenseApplicationRepository;
import com.pawhub.web.dto.RejectVetApplicationRequest;
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

    @Transactional
    public VetLicenseApplicationAdminDto approve(Long applicationId) {
        VetLicenseApplication a = vetLicenseApplicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        requirePending(a);
        a.setStatus(VetVerificationStatus.APPROVED);
        a.setRejectionReason(null);
        return toDto(vetLicenseApplicationRepository.save(a));
    }

    @Transactional
    public VetLicenseApplicationAdminDto reject(Long applicationId, RejectVetApplicationRequest req) {
        VetLicenseApplication a = vetLicenseApplicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        requirePending(a);
        a.setStatus(VetVerificationStatus.REJECTED);
        a.setRejectionReason(req.reason().trim());
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
                a.getLicenseNumber(),
                a.getUniversity(),
                a.getYearsExperience(),
                a.getPhone(),
                a.getProfessionalBio(),
                a.getStatus().name(),
                a.getRejectionReason(),
                a.getCreatedAt(),
                docUrls);
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
