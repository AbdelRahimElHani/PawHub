package com.pawhub.service;

import com.pawhub.domain.VetVerificationStatus;
import com.pawhub.repository.VetLicenseApplicationRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PawVetPublicService {

    private final VetLicenseApplicationRepository vetLicenseApplicationRepository;

    /** Display names of recently approved veterinarians (for trust UI). */
    @Transactional(readOnly = true)
    public List<String> verifiedVetDisplayNames() {
        return vetLicenseApplicationRepository
                .findTop8ByStatusOrderByCreatedAtDesc(VetVerificationStatus.APPROVED)
                .stream()
                .map(a -> a.getUser().getDisplayName())
                .toList();
    }
}
