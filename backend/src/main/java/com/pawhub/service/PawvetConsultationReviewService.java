package com.pawhub.service;

import com.pawhub.domain.AppNotificationKind;
import com.pawhub.domain.PawvetConsultationReview;
import com.pawhub.domain.User;
import com.pawhub.domain.UserAccountType;
import com.pawhub.domain.VetLicenseApplication;
import com.pawhub.domain.VetVerificationStatus;
import com.pawhub.repository.PawvetConsultationReviewRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.repository.VetLicenseApplicationRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.PawVetConsultationReviewDto;
import com.pawhub.web.dto.SubmitPawVetConsultationReviewRequest;
import com.pawhub.web.dto.VetAccountReviewsAdminDto;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PawvetConsultationReviewService {

    /** Stored in {@link VetLicenseApplication#setRejectionReason} when an admin revokes verification from reviews. */
    private static final String VET_ADMIN_REVOKE_REASON_LEAD =
            "Your PawVet verification was revoked by a PawHub administrator.";

    private final PawvetConsultationReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final VetLicenseApplicationRepository vetLicenseApplicationRepository;
    private final AppNotificationService appNotificationService;

    @Transactional
    public PawVetConsultationReviewDto submit(SecurityUser principal, SubmitPawVetConsultationReviewRequest req) {
        if (reviewRepository.existsByExternalCaseId(req.externalCaseId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This case was already reviewed.");
        }
        User owner = userRepository.getReferenceById(principal.getId());
        User vet = userRepository
                .findById(req.vetUserId())
                .orElseThrow(() -> new IllegalArgumentException("Veterinarian not found."));
        if (vet.getAccountType() != UserAccountType.VET) {
            throw new IllegalArgumentException("Target user is not a veterinarian account.");
        }
        VetLicenseApplication app = vetLicenseApplicationRepository
                .findByUser_Id(vet.getId())
                .orElseThrow(() -> new IllegalArgumentException("Veterinarian has no credentialing record."));
        if (app.getStatus() != VetVerificationStatus.APPROVED) {
            throw new IllegalArgumentException("You can only review approved veterinarians.");
        }
        if (req.stars() < 1 || req.stars() > 5) {
            throw new IllegalArgumentException("Stars must be between 1 and 5.");
        }
        String comment = req.comment() == null || req.comment().isBlank() ? null : req.comment().trim();

        PawvetConsultationReview row = PawvetConsultationReview.builder()
                .externalCaseId(req.externalCaseId().trim())
                .vet(vet)
                .owner(owner)
                .stars(req.stars())
                .comment(comment)
                .build();
        reviewRepository.save(row);
        String excerpt = comment == null ? "Thanks for the great care!" : comment;
        if (excerpt.length() > 140) {
            excerpt = excerpt.substring(0, 137) + "…";
        }
        appNotificationService.publish(
                vet.getId(),
                AppNotificationKind.VET_NEW_REVIEW,
                "New consultation review",
                String.format("A user left you a %d-star review: \"%s\"", req.stars(), excerpt.replace("\"", "'")),
                "/vet",
                "star",
                owner.getAvatarUrl());
        return toDto(row);
    }

    @Transactional(readOnly = true)
    public List<PawVetConsultationReviewDto> listMineForVet(SecurityUser principal) {
        User me = principal.getUser();
        if (me.getAccountType() != UserAccountType.VET) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only veterinarian accounts can load consultation reviews.");
        }
        return reviewRepository.findByVet_IdOrderByCreatedAtDesc(me.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<VetAccountReviewsAdminDto> listAllVetAccountsWithReviewsForAdmin() {
        List<User> vets = userRepository.findByAccountTypeOrderByIdAsc(UserAccountType.VET);
        if (vets.isEmpty()) {
            return List.of();
        }
        List<Long> vetIds = vets.stream().map(User::getId).toList();
        List<PawvetConsultationReview> all = vetIds.isEmpty() ? List.of() : reviewRepository.findByVet_IdIn(vetIds);
        Map<Long, List<PawvetConsultationReview>> byVet = all.stream()
                .sorted(Comparator.comparing(PawvetConsultationReview::getCreatedAt).reversed())
                .collect(Collectors.groupingBy(r -> r.getVet().getId(), LinkedHashMap::new, Collectors.toList()));

        List<VetAccountReviewsAdminDto> out = new ArrayList<>();
        for (User vet : vets) {
            List<PawvetConsultationReview> revs = byVet.getOrDefault(vet.getId(), List.of());
            var appOpt = vetLicenseApplicationRepository.findByUser_Id(vet.getId());
            String vStatus = appOpt.map(a -> a.getStatus().name()).orElse("NONE");
            boolean revokedByAdmin =
                    appOpt
                            .map(a ->
                                    a.getStatus() == VetVerificationStatus.REJECTED
                                            && a.getRejectionReason() != null
                                            && a.getRejectionReason().startsWith(VET_ADMIN_REVOKE_REASON_LEAD))
                            .orElse(false);
            double avg = 0;
            if (!revs.isEmpty()) {
                avg = revs.stream().mapToInt(PawvetConsultationReview::getStars).average().orElse(0);
            }
            List<PawVetConsultationReviewDto> dtos = revs.stream().map(this::toDto).toList();
            out.add(new VetAccountReviewsAdminDto(
                    vet.getId(),
                    vet.getDisplayName(),
                    vet.getEmail(),
                    vStatus,
                    revokedByAdmin,
                    avg,
                    revs.size(),
                    dtos));
        }
        return out;
    }

    /**
     * Revokes PawVet verification for a veterinarian: keeps {@link UserAccountType#VET}, sets license application to
     * {@link VetVerificationStatus#REJECTED}, clears appeal state so they may submit one appeal (same pattern as shelter
     * verification revoke). Triage case access remains gated on {@code APPROVED} elsewhere.
     */
    @Transactional
    public void revokeVeterinarianCredentials(long vetUserId) {
        User vet = userRepository
                .findById(vetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        if (vet.getAccountType() != UserAccountType.VET) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That account is not registered as a veterinarian.");
        }
        VetLicenseApplication app = vetLicenseApplicationRepository
                .findByUser_Id(vetUserId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.CONFLICT, "No veterinarian license application on file for this account."));
        app.setStatus(VetVerificationStatus.REJECTED);
        app.setRejectionReason(
                VET_ADMIN_REVOKE_REASON_LEAD
                        + " Your account remains a veterinarian "
                        + "profile, but you cannot claim triage cases until credentials are approved again. Open your vet "
                        + "dashboard to read this notice—you may submit one appeal there if you believe this should be "
                        + "reconsidered.");
        app.setAppealMessage(null);
        app.setAppealSubmittedAt(null);
        app.setAppealState(null);
        vetLicenseApplicationRepository.save(app);

        appNotificationService.publishWithInboxNudge(
                vetUserId,
                AppNotificationKind.VET_VERIFICATION_REVOKED,
                "PawVet verification ended",
                app.getRejectionReason(),
                "/vet",
                "vet",
                null);
    }

    private PawVetConsultationReviewDto toDto(PawvetConsultationReview r) {
        User owner = r.getOwner();
        return new PawVetConsultationReviewDto(
                r.getId(),
                r.getExternalCaseId(),
                r.getVet().getId(),
                owner.getId(),
                owner.getDisplayName(),
                r.getStars(),
                r.getComment(),
                r.getCreatedAt().atOffset(ZoneOffset.UTC).toString());
    }
}
