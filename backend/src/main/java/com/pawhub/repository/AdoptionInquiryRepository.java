package com.pawhub.repository;

import com.pawhub.domain.AdoptionInquiry;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdoptionInquiryRepository extends JpaRepository<AdoptionInquiry, Long> {

    Optional<AdoptionInquiry> findByAdoptionListingIdAndUserId(Long listingId, Long userId);
}
