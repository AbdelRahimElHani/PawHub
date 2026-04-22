package com.pawhub.web;

import com.pawhub.service.CatService;
import com.pawhub.service.CatVisionService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.CatDto;
import com.pawhub.web.dto.CatUpsertRequest;
import com.pawhub.web.dto.CatVisionProfileDto;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/cats")
@RequiredArgsConstructor
public class CatController {

    private final CatService catService;
    private final CatVisionService catVisionService;

    @GetMapping
    public List<CatDto> mine(@AuthenticationPrincipal SecurityUser user) {
        return catService.mine(user);
    }

    @GetMapping("/{id}")
    public CatDto get(@PathVariable Long id, @AuthenticationPrincipal SecurityUser user) {
        return catService.get(id, user);
    }

    @PostMapping
    public CatDto create(@Valid @RequestBody CatUpsertRequest req, @AuthenticationPrincipal SecurityUser user) {
        return catService.create(req, user);
    }

    @PutMapping("/{id}")
    public CatDto update(
            @PathVariable Long id, @Valid @RequestBody CatUpsertRequest req, @AuthenticationPrincipal SecurityUser user) {
        return catService.update(id, req, user);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, @AuthenticationPrincipal SecurityUser user) {
        catService.delete(id, user);
    }

    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CatDto addPhoto(
            @PathVariable Long id, @RequestPart("file") MultipartFile file, @AuthenticationPrincipal SecurityUser user)
            throws Exception {
        return catService.addPhoto(id, file, user);
    }

    /** Gemini vision → coat colors, rough body size, breed guess, activity — for profile enrichment when adding a photo. */
    @PostMapping(value = "/vision-profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CatVisionProfileDto visionProfile(@RequestPart("file") MultipartFile file) throws Exception {
        return catVisionService.analyzePhoto(file.getBytes(), file.getContentType());
    }
}
