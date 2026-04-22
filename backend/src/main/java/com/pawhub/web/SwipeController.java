package com.pawhub.web;

import com.pawhub.service.SwipeService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.CatCardDto;
import com.pawhub.web.dto.SwipeRequest;
import com.pawhub.web.dto.SwipeResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pawmatch")
@RequiredArgsConstructor
public class SwipeController {

    private final SwipeService swipeService;

    @GetMapping("/candidates")
    public CatCardDto next(@RequeostParam Long myCatId, @AuthenticationPrincipal SecurityUser user) {
        return swipeService.nextCandidate(myCatId, user);
    }

    @PostMapping("/swipes")
    public SwipeResponse swipe(@Valid @RequestBody SwipeRequest req, @AuthenticationPrincipal SecurityUser user) {
        return swipeService.swipe(req, user);
    }
}
