package com.pawhub.web;

import com.pawhub.service.PawVetPublicService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pawvet")
@RequiredArgsConstructor
public class PawVetPublicController {

    private final PawVetPublicService pawVetPublicService;

    @GetMapping("/verified-vet-names")
    public List<String> verifiedVetNames() {
        return pawVetPublicService.verifiedVetDisplayNames();
    }
}
