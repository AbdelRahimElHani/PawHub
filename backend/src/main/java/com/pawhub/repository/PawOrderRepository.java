package com.pawhub.repository;

import com.pawhub.domain.PawOrder;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PawOrderRepository extends JpaRepository<PawOrder, Long> {

    Optional<PawOrder> findByListingIdAndBuyerId(Long listingId, Long buyerId);

    boolean existsByListingId(Long listingId);

    @Query("SELECT COALESCE(SUM(o.quantity), 0) FROM PawOrder o WHERE o.listing.id = :listingId")
    long sumQuantityByListingId(@Param("listingId") Long listingId);
}
