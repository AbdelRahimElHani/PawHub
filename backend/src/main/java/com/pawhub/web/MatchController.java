package com.pawhub.web;

import com.pawhub.service.MatchQueryService;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.MatchSummaryDto;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchQueryService matchQueryService;

    @GetMapping
    public List<MatchSummaryDto> mine(@AuthenticationPrincipal SecurityUser user) {
        return matchQueryService.myMatches(user);
    }
}
