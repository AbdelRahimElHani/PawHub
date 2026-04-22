package com.pawhub.web;

import com.pawhub.security.SecurityUser;
import com.pawhub.service.PawvetConsultationReviewService;
import com.pawhub.web.dto.PawVetConsultationReviewDto;
import com.pawhub.web.dto.SubmitPawVetConsultationReviewRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pawvet/consultation-reviews")
@RequiredArgsConstructor
public class PawVetConsultationReviewController {

    private final PawvetConsultationReviewService pawvetConsultationReviewService;

    @PostMapping
    public PawVetConsultationReviewDto submit(
            @Valid @RequestBody SubmitPawVetConsultationReviewRequest req, @AuthenticationPrincipal SecurityUser user) {
        return pawvetConsultationReviewService.submit(user, req);
    }

    @GetMapping("/mine")
    public List<PawVetConsultationReviewDto> mine(@AuthenticationPrincipal SecurityUser user) {
        return pawvetConsultationReviewService.listMineForVet(user);
    }
}
