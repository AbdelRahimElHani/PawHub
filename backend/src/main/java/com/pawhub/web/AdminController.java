package com.pawhub.web;

import com.pawhub.service.AdminShelterService;
import com.pawhub.web.dto.ShelterDto;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminShelterService adminShelterService;

    @GetMapping("/shelters/pending")
    public List<ShelterDto> pending() {
        return adminShelterService.pending();
    }

    @PostMapping("/shelters/{id}/approve")
    public ShelterDto approve(@PathVariable Long id) {
        return adminShelterService.approve(id);
    }

    @PostMapping("/shelters/{id}/reject")
    public ShelterDto reject(@PathVariable Long id) {
        return adminShelterService.reject(id);
    }
}
