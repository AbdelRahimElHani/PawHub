package com.pawhub.repository;

import com.pawhub.domain.ListingStatus;
import com.pawhub.domain.MarketListing;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MarketListingRepository extends JpaRepository<MarketListing, Long> {

    List<MarketListing> findByStatusOrderByCreatedAtDesc(ListingStatus status);

    List<MarketListing> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query(
            """
            SELECT l FROM MarketListing l
            WHERE l.status = 'ACTIVE'
            AND (:city IS NULL OR LOWER(l.city) LIKE LOWER(CONCAT('%', :city, '%')))
            AND (:region IS NULL OR LOWER(l.region) LIKE LOWER(CONCAT('%', :region, '%')))
            ORDER BY l.createdAt DESC
            """)
    List<MarketListing> searchActive(@Param("city") String city, @Param("region") String region);
}
