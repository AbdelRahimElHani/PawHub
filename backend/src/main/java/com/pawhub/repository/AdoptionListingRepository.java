package com.pawhub.repository;

import com.pawhub.domain.AdoptionListing;
import com.pawhub.domain.ListingStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdoptionListingRepository extends JpaRepository<AdoptionListing, Long> {

    List<AdoptionListing> findByStatusOrderByCreatedAtDesc(ListingStatus status);

    List<AdoptionListing> findByShelterIdAndStatusOrderByCreatedAtDesc(Long shelterId, ListingStatus status);
}
