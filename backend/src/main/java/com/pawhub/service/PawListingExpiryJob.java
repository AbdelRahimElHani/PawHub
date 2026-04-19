package com.pawhub.service;

import com.pawhub.domain.MarketListing;
import com.pawhub.domain.PawListingStatus;
import com.pawhub.repository.MarketListingRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Marks Paw Market listings as expired 30 days after listing (hidden from browse). */
@Slf4j
@Component
@RequiredArgsConstructor
public class PawListingExpiryJob {

    static final int PUBLIC_LISTING_DAYS = 30;

    private final MarketListingRepository listingRepository;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void expireStaleListings() {
        Instant cutoff = Instant.now().minus(PUBLIC_LISTING_DAYS, ChronoUnit.DAYS);
        List<MarketListing> stale =
                listingRepository.findPawListingsCreatedBefore(
                        EnumSet.of(PawListingStatus.Available, PawListingStatus.Pending), cutoff);
        for (MarketListing l : stale) {
            l.setPawStatus(PawListingStatus.Expired);
        }
        if (!stale.isEmpty()) {
            log.info("Paw Market: marked {} listing(s) as Expired (older than {} days).", stale.size(), PUBLIC_LISTING_DAYS);
        }
    }
}
