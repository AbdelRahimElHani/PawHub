package com.pawhub.web;

import com.pawhub.service.MarketService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.MarketListingDto;
import com.pawhub.web.dto.MarketListingUpsertRequest;
import com.pawhub.web.dto.ThreadIdResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketController {

    private final MarketService marketService;

    @GetMapping("/listings")
    public List<MarketListingDto> browse(
            @RequestParam(required = false) String city, @RequestParam(required = false) String region) {
        return marketService.browse(city, region);
    }

    @GetMapping("/listings/mine")
    public List<MarketListingDto> mine(@AuthenticationPrincipal SecurityUser user) {
        return marketService.mine(user);
    }

    @GetMapping("/listings/{id}")
    public MarketListingDto get(@PathVariable Long id) {
        return marketService.get(id);
    }

    @PostMapping("/listings")
    public MarketListingDto create(@Valid @RequestBody MarketListingUpsertRequest req, @AuthenticationPrincipal SecurityUser user) {
        return marketService.create(req, user);
    }

    @PutMapping("/listings/{id}")
    public MarketListingDto update(
            @PathVariable Long id,
            @Valid @RequestBody MarketListingUpsertRequest req,
            @AuthenticationPrincipal SecurityUser user) {
        return marketService.update(id, req, user);
    }

    @PostMapping(value = "/listings/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MarketListingDto uploadPhoto(
            @PathVariable Long id, @RequestPart("file") MultipartFile file, @AuthenticationPrincipal SecurityUser user)
            throws Exception {
        return marketService.uploadPhoto(id, file, user);
    }

    @PostMapping("/listings/{id}/thread")
    public ThreadIdResponse openThread(@PathVariable Long id, @AuthenticationPrincipal SecurityUser user) {
        return new ThreadIdResponse(marketService.openOrGetListingThread(id, user));
    }
}
