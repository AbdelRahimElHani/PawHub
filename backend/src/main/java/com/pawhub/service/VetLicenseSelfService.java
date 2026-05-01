package com.pawhub.service;

import com.pawhub.domain.AppNotificationKind;
import com.pawhub.domain.UserAccountType;
import com.pawhub.domain.VetAppealState;
import com.pawhub.domain.VetLicenseApplication;
import com.pawhub.domain.VetVerificationStatus;
import com.pawhub.repository.VetLicenseApplicationRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.SubmitVetAppealRequest;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class VetLicenseSelfService {

    private final VetLicenseApplicationRepository vetLicenseApplicationRepository;
    private final AppNotificationService appNotificationService;

    @Transactional
    public void submitAppeal(SecurityUser principal, SubmitVetAppealRequest req) {
        if (principal.getUser().getAccountType() != UserAccountType.VET) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only veterinarian accounts can submit an appeal.");
        }
        VetLicenseApplication app = vetLicenseApplicationRepository
                .findByUser_Id(principal.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No veterinarian application on file."));
        if (app.getStatus() != VetVerificationStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You can only appeal a rejected application.");
        }
        if (app.getAppealState() == VetAppealState.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An appeal is already pending review.");
        }
        if (app.getAppealState() == VetAppealState.REJECTED_FINAL) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Your previous appeal was not accepted. You cannot submit another appeal.");
        }
        app.setAppealMessage(req.message().trim());
        app.setAppealSubmittedAt(Instant.now());
        app.setAppealState(VetAppealState.PENDING);
        vetLicenseApplicationRepository.save(app);
        appNotificationService.publishToAdmins(
                AppNotificationKind.ADMIN_VET_LICENSE_APPEAL_PENDING,
                "Veterinarian license appeal",
                String.format(
                        "%s submitted an appeal after rejection. Review in PawVet admin.",
                        principal.getUser().getDisplayName()),
                "/adopt/admin/vet-verification");
    }
}
