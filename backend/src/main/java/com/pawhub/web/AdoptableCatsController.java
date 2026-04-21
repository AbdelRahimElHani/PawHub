package com.pawhub.web;

import com.pawhub.service.AdoptionService;
import com.pawhub.web.dto.AdoptionListingDto;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Alias for browse listings — same payload as {@code GET /api/adopt/listings}. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AdoptableCatsController {

    private final AdoptionService adoptionService;

    @GetMapping("/adoptable-cats")
    public List<AdoptionListingDto> adoptableCats() {
        return adoptionService.browse();
    }
}
