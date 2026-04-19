package com.pawhub.repository;

import com.pawhub.domain.ListingStatus;
import com.pawhub.domain.MarketListing;
import com.pawhub.domain.PawListingStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM MarketListing l WHERE l.id = :id")
    Optional<MarketListing> findByIdForUpdate(@Param("id") Long id);

    @Query(
            "SELECT l FROM MarketListing l WHERE l.pawStatus IN :statuses AND l.createdAt < :cutoff")
    List<MarketListing> findPawListingsCreatedBefore(
            @Param("statuses") Collection<PawListingStatus> statuses, @Param("cutoff") Instant cutoff);
}
