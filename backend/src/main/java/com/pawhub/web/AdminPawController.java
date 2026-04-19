package com.pawhub.web;

import com.pawhub.service.PawMarketService;
import com.pawhub.web.dto.PawListingDto;
import com.pawhub.web.dto.PawListingUpsertRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/paw")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPawController {

    private final PawMarketService pawMarketService;

    @GetMapping("/listings")
    public List<PawListingDto> listAll() {
        return pawMarketService.adminListAll();
    }

    @PutMapping("/listings/{id}")
    public PawListingDto update(@PathVariable Long id, @Valid @RequestBody PawListingUpsertRequest req) {
        return pawMarketService.adminUpdateListing(id, req);
    }

    @DeleteMapping("/listings/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        pawMarketService.adminForceDeleteListing(id);
    }
}
