package com.pawhub.repository;

import com.pawhub.domain.PawOrder;
import com.pawhub.domain.PawOrderSellerStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PawOrderRepository extends JpaRepository<PawOrder, Long> {

    Optional<PawOrder> findByListingIdAndBuyerId(Long listingId, Long buyerId);

    Optional<PawOrder> findFirstByThreadIdOrderByCreatedAtDesc(Long threadId);

    boolean existsByListingId(Long listingId);

    List<PawOrder> findByBuyerIdAndSellerStatusOrderByCreatedAtDesc(Long buyerId, PawOrderSellerStatus sellerStatus);

    @Query("SELECT COALESCE(SUM(o.quantity), 0) FROM PawOrder o WHERE o.listing.id = :listingId")
    long sumQuantityByListingId(@Param("listingId") Long listingId);

    @Query(
            "SELECT COALESCE(SUM(o.quantity), 0) FROM PawOrder o WHERE o.listing.id = :listingId AND o.sellerStatus = :status")
    long sumQuantityByListingIdAndSellerStatus(
            @Param("listingId") Long listingId, @Param("status") PawOrderSellerStatus status);
}
