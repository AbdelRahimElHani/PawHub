package com.pawhub.service;

import com.pawhub.domain.PawMatch;
import com.pawhub.repository.PawMatchRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.MatchSummaryDto;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchQueryService {

    private final PawMatchRepository pawMatchRepository;

    @Transactional(readOnly = true)
    public List<MatchSummaryDto> myMatches(SecurityUser principal) {
        return pawMatchRepository.findForUser(principal.getId()).stream()
                .map(m -> toDto(m, principal.getId()))
                .toList();
    }

    private MatchSummaryDto toDto(PawMatch m, Long me) {
        boolean iOwnA = m.getCatA().getUser().getId().equals(me);
        var myCat = iOwnA ? m.getCatA() : m.getCatB();
        var otherCat = iOwnA ? m.getCatB() : m.getCatA();
        return new MatchSummaryDto(
                m.getId(),
                m.getThread().getId(),
                myCat.getName(),
                otherCat.getName(),
                otherCat.getUser().getDisplayName());
    }
}
