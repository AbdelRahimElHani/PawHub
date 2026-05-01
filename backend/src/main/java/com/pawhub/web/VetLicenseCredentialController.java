package com.pawhub.web;

import com.pawhub.security.SecurityUser;
import com.pawhub.service.VetLicenseSelfService;
import com.pawhub.web.dto.SubmitVetAppealRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pawvet/vet-license")
@RequiredArgsConstructor
public class VetLicenseCredentialController {

    private final VetLicenseSelfService vetLicenseSelfService;

    @PostMapping("/appeal")
    @PreAuthorize("isAuthenticated()")
    public void submitAppeal(@Valid @RequestBody SubmitVetAppealRequest req, @AuthenticationPrincipal SecurityUser user) {
        vetLicenseSelfService.submitAppeal(user, req);
    }
}
