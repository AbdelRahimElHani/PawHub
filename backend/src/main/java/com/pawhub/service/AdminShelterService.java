package com.pawhub.service;

import com.pawhub.domain.AppNotificationKind;
import com.pawhub.domain.Shelter;
import com.pawhub.domain.ShelterAppealState;
import com.pawhub.domain.ShelterStatus;
import com.pawhub.repository.ShelterRepository;
import com.pawhub.web.dto.RejectShelterAppealRequest;
import com.pawhub.web.dto.RejectShelterApplicationRequest;
import com.pawhub.web.dto.ShelterDto;
import com.pawhub.web.dto.ShelterDtoMapper;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AdminShelterService {

    private final ShelterRepository shelterRepository;
    private final AppNotificationService appNotificationService;

    /**
     * Admin queue: pending shelters with a submitted dossier first (oldest submission first), then any other pending
     * rows (e.g. legacy signups without dossier timestamps) for tooling and seeds.
     */
    @Transactional(readOnly = true)
    public List<ShelterDto> pendingSubmissions() {
        List<ShelterDto> out = new ArrayList<>();
        shelterRepository
                .findByStatusAndProfileCompletedAtIsNotNullOrderByProfileCompletedAtAsc(ShelterStatus.PENDING)
                .forEach(s -> out.add(ShelterDtoMapper.fromEntity(s)));
        shelterRepository.findByStatusOrderByCreatedAtAsc(ShelterStatus.PENDING).stream()
                .filter(s -> s.getProfileCompletedAt() == null)
                .map(ShelterDtoMapper::fromEntity)
                .forEach(out::add);
        return out;
    }

    @Transactional(readOnly = true)
    public List<ShelterDto> byStatus(ShelterStatus status) {
        return shelterRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(ShelterDtoMapper::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShelterDto> appealsPending() {
        return shelterRepository.findByAppealStateOrderByAppealSubmittedAtAsc(ShelterAppealState.PENDING).stream()
                .map(ShelterDtoMapper::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ShelterDto> allOrderedByNewest() {
        return shelterRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(ShelterDtoMapper::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public ShelterDto getShelter(Long shelterId) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow(() -> notFound(shelterId));
        return ShelterDtoMapper.fromEntity(s);
    }

    @Transactional
    public ShelterDto approve(Long shelterId) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow(() -> notFound(shelterId));
        requirePending(s);
        s.setStatus(ShelterStatus.APPROVED);
        s.setApplicationRejectionReason(null);
        s.setAppealMessage(null);
        s.setAppealSubmittedAt(null);
        s.setAppealState(null);
        shelterRepository.save(s);
        appNotificationService.publish(
                s.getUser().getId(),
                AppNotificationKind.SHELTER_VERIFIED,
                "Shelter verified",
                "Your shelter profile has been verified by PawHub Admin.",
                "/adopt/shelter",
                "shelter",
                null);
        return ShelterDtoMapper.fromEntity(s);
    }

    @Transactional
    public ShelterDto reject(Long shelterId, RejectShelterApplicationRequest req) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow(() -> notFound(shelterId));
        requirePending(s);
        s.setStatus(ShelterStatus.REJECTED);
        s.setAppealMessage(null);
        s.setAppealSubmittedAt(null);
        s.setAppealState(null);
        String reason = req != null && req.reason() != null && !req.reason().isBlank() ? req.reason().trim() : null;
        s.setApplicationRejectionReason(reason);
        shelterRepository.save(s);
        String body =
                "Your shelter partner application for \""
                        + s.getName().replace("\"", "'")
                        + "\" was not approved."
                        + (reason != null ? " Note: " + reason.replace("\"", "'") : "")
                        + " You may submit one appeal from your shelter page if you believe this should be reviewed again.";
        appNotificationService.publish(
                s.getUser().getId(),
                AppNotificationKind.SHELTER_APPLICATION_REJECTED,
                "Shelter application not approved",
                body,
                "/adopt/shelter",
                "shelter",
                null);
        return ShelterDtoMapper.fromEntity(s);
    }

    @Transactional
    public ShelterDto acceptAppeal(Long shelterId) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow(() -> notFound(shelterId));
        if (s.getStatus() != ShelterStatus.REJECTED || s.getAppealState() != ShelterAppealState.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This shelter has no pending appeal to accept.");
        }
        s.setStatus(ShelterStatus.APPROVED);
        s.setApplicationRejectionReason(null);
        s.setAppealMessage(null);
        s.setAppealSubmittedAt(null);
        s.setAppealState(null);
        shelterRepository.save(s);
        appNotificationService.publish(
                s.getUser().getId(),
                AppNotificationKind.SHELTER_VERIFIED,
                "Shelter verified",
                "Your appeal was accepted. "
                        + s.getName().replace("\"", "'")
                        + " is again a verified Paw Adopt partner and your eligible listings can appear to adopters.",
                "/adopt/shelter",
                "shelter",
                null);
        return ShelterDtoMapper.fromEntity(s);
    }

    @Transactional
    public ShelterDto rejectAppeal(Long shelterId, RejectShelterAppealRequest req) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow(() -> notFound(shelterId));
        if (s.getAppealState() != ShelterAppealState.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This shelter has no pending appeal.");
        }
        s.setAppealState(ShelterAppealState.REJECTED_FINAL);
        String extra = req != null && req.reason() != null && !req.reason().isBlank()
                ? " Admin note: " + req.reason().trim()
                : "";
        appNotificationService.publishWithInboxNudge(
                s.getUser().getId(),
                AppNotificationKind.SYSTEM_ANNOUNCEMENT,
                "Appeal not accepted",
                "Your appeal was reviewed and was not accepted. You cannot submit another appeal for this application."
                        + extra,
                "/adopt/shelter",
                "system",
                null);
        return ShelterDtoMapper.fromEntity(shelterRepository.save(s));
    }

    @Transactional
    public ShelterDto revokeVerification(Long shelterId) {
        Shelter s = shelterRepository.findById(shelterId).orElseThrow(() -> notFound(shelterId));
        if (s.getStatus() != ShelterStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Shelter verification can only be revoked for approved partners.");
        }
        s.setStatus(ShelterStatus.REJECTED);
        s.setApplicationRejectionReason("Shelter verification was revoked by PawHub Admin.");
        s.setAppealMessage(null);
        s.setAppealSubmittedAt(null);
        s.setAppealState(null);
        shelterRepository.save(s);
        appNotificationService.publish(
                s.getUser().getId(),
                AppNotificationKind.SHELTER_VERIFICATION_REVOKED,
                "Shelter verification ended",
                "Your shelter’s verified partner status on Paw Adopt was revoked by an administrator. "
                        + "Your live adoption listings are no longer visible to the public. "
                        + "Open Shelter & verification to read the notice—you may submit one appeal there if you believe this should be reconsidered.",
                "/adopt/shelter",
                "shelter",
                null);
        return ShelterDtoMapper.fromEntity(s);
    }

    private static void requirePending(Shelter s) {
        if (s.getStatus() != ShelterStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Shelter is not pending review (current status: " + s.getStatus() + ").");
        }
    }

    private static ResponseStatusException notFound(Long shelterId) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Shelter not found: " + shelterId);
    }
}
