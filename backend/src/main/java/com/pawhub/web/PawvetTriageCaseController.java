package com.pawhub.web;

import com.pawhub.security.SecurityUser;
import com.pawhub.service.PawvetTriageCaseService;
import com.pawhub.web.dto.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/pawvet/triage-cases")
@RequiredArgsConstructor
public class PawvetTriageCaseController {

    private final PawvetTriageCaseService triageCaseService;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public PawvetTriageCaseDto create(
            @Valid @RequestBody CreatePawvetTriageCaseRequest req, @AuthenticationPrincipal SecurityUser user) {
        return triageCaseService.create(user, req);
    }

    @PostMapping(value = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadMedia(
            @RequestPart("file") MultipartFile file, @AuthenticationPrincipal SecurityUser user) throws Exception {
        String url = triageCaseService.uploadMedia(user, file);
        return Map.of("url", url);
    }

    @GetMapping("/open")
    public List<PawvetTriageCaseDto> openBoard(@AuthenticationPrincipal SecurityUser user) {
        return triageCaseService.listOpenBoard(user);
    }

    @GetMapping("/mine")
    public List<PawvetTriageCaseDto> mine(@AuthenticationPrincipal SecurityUser user) {
        return triageCaseService.listMineAsOwner(user);
    }

    @GetMapping("/my-claims")
    public List<PawvetTriageCaseDto> myClaims(@AuthenticationPrincipal SecurityUser user) {
        return triageCaseService.listMyClaims(user);
    }

    @GetMapping("/my-resolved-archive")
    public List<PawvetTriageCaseDto> myResolvedArchive(@AuthenticationPrincipal SecurityUser user) {
        return triageCaseService.listMyResolvedArchive(user);
    }

    @GetMapping("/{id}")
    public PawvetTriageCaseDto get(@PathVariable long id, @AuthenticationPrincipal SecurityUser user) {
        return triageCaseService.get(user, id);
    }

    @PostMapping("/{id}/claim")
    public PawvetTriageCaseDto claim(@PathVariable long id, @AuthenticationPrincipal SecurityUser user) {
        return triageCaseService.claim(user, id);
    }

    @PostMapping("/{id}/messages")
    public PawvetTriageCaseDto appendMessage(
            @PathVariable long id,
            @Valid @RequestBody AppendPawvetTriageMessageRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        return triageCaseService.appendMessage(user, id, req);
    }

    @PostMapping(value = "/{id}/message-media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadMessageMedia(
            @PathVariable long id, @RequestPart("file") MultipartFile file, @AuthenticationPrincipal SecurityUser user)
            throws Exception {
        String url = triageCaseService.uploadMessageAttachment(user, id, file);
        return Map.of("url", url);
    }

    @PostMapping("/{id}/resolve")
    public PawvetTriageCaseDto resolve(
            @PathVariable long id,
            @Valid @RequestBody ResolvePawvetTriageCaseRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        return triageCaseService.resolve(user, id, req);
    }

    @PostMapping("/{id}/report-vet")
    public void reportVet(
            @PathVariable long id,
            @Valid @RequestBody SubmitPawvetVetReportRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        triageCaseService.submitVetReport(user, id, req);
    }
}
