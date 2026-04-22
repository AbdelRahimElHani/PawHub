package com.pawhub.service;

import com.pawhub.config.PawhubProperties;
import com.pawhub.domain.*;
import com.pawhub.repository.*;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.*;
import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class PawMarketService {

    private final MarketListingRepository listingRepository;
    private final PawOrderRepository orderRepository;
    private final PawReviewRepository reviewRepository;
    private final ChatThreadRepository chatThreadRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final AiCatCheckService aiCatCheckService;
    private final SimpMessagingTemplate messagingTemplate;
    private final PawhubProperties pawhubProperties;

    // ── Browse ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PawListingDto> browse(
            String category, Boolean isFree, String city, String region, Long excludeSellerUserId) {
        String cityNorm = normalizeFilter(city);
        String regionNorm = normalizeFilter(region);
        return listingRepository.findAll().stream()
                .filter(l -> l.getPawStatus() == PawListingStatus.Available)
                .filter(l -> l.getStockQuantity() > 0)
                .filter(l -> !isPastPublicWindow(l))
                .filter(l -> excludeSellerUserId == null
                        || !l.getUser().getId().equals(excludeSellerUserId))
                .filter(l -> category == null || category.isBlank()
                        || (l.getCategory() != null
                                && l.getCategory().name().equalsIgnoreCase(category)))
                .filter(l -> isFree == null || l.isFree() == isFree)
                .filter(l -> matchesBuyerLocation(l, cityNorm, regionNorm))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toDto)
                .toList();
    }

    private static String normalizeFilter(String s) {
        if (s == null) {
            return "";
        }
        return s.trim().toLowerCase(Locale.ROOT);
    }

    /** city_text plus country so buyer city substring matches catalog-backed listings. */
    private static String combinedLocationText(MarketListing l) {
        String t = l.getCityText() != null ? l.getCityText().toLowerCase(Locale.ROOT) : "";
        String c = l.getCountry() != null ? l.getCountry().trim().toLowerCase(Locale.ROOT) : "";
        if (c.isEmpty()) {
            return t;
        }
        return (t + " " + c).trim();
    }

    /**
     * When the buyer sets a city (and optionally region), only listings whose seller location matches are shown.
     * Empty filters mean no location restriction.
     */
    private static boolean matchesBuyerLocation(MarketListing l, String cityNorm, String regionNorm) {
        if (cityNorm.isEmpty() && regionNorm.isEmpty()) {
            return true;
        }
        String lct = combinedLocationText(l);
        if (!cityNorm.isEmpty()) {
            String lc = l.getCity() != null ? l.getCity().trim().toLowerCase(Locale.ROOT) : "";
            boolean cityOk = lc.equals(cityNorm) || (!lct.isEmpty() && lct.contains(cityNorm));
            if (!cityOk) {
                return false;
            }
        }
        if (!regionNorm.isEmpty()) {
            String lr = l.getRegion() != null ? l.getRegion().trim().toLowerCase(Locale.ROOT) : "";
            boolean regionOk = lr.equals(regionNorm) || (!lct.isEmpty() && lct.contains(regionNorm));
            if (!regionOk) {
                return false;
            }
        }
        return true;
    }

    @Transactional(readOnly = true)
    public List<PawListingDto> mine(SecurityUser principal) {
        return listingRepository.findByUserIdOrderByCreatedAtDesc(principal.getId()).stream()
                .filter(l -> l.getPawStatus() != null)
                .sorted(Comparator.<MarketListing, Integer>comparing(
                                l -> l.getPawStatus() == PawListingStatus.Available ? 0 : 1)
                        .thenComparing(
                                MarketListing::getCreatedAt,
                                Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toDto)
                .toList();
    }

    /**
     * Seller marks an active listing as sold outside the normal checkout (e.g. cash deal, sold elsewhere).
     * Listing stays in “mine” as {@link PawListingStatus#Sold} with zero stock and is hidden from browse.
     */
    @Transactional
    public PawListingDto markSoldOffMarket(Long id, SecurityUser principal) {
        MarketListing l = listingRepository.findById(id).orElseThrow();
        assertOwner(l, principal);
        if (l.getPawStatus() != PawListingStatus.Available) {
            throw new IllegalStateException("Only active listings can be marked as sold.");
        }
        l.setStockQuantity(0);
        l.setPawStatus(PawListingStatus.Sold);
        l.setStatus(ListingStatus.SOLD);
        listingRepository.save(l);
        return toDto(l);
    }

    @Transactional(readOnly = true)
    public PawListingDto get(Long id) {
        return listingRepository.findById(id).map(this::toDto).orElseThrow();
    }

    // ── Create / Update ───────────────────────────────────────────────────

    @Transactional
    public PawListingDto create(PawListingUpsertRequest req, SecurityUser principal) {
        User user = userRepository.getReferenceById(principal.getId());
        int stock = req.stockQuantity() != null ? req.stockQuantity() : 1;

        MarketListing l = MarketListing.builder()
                .user(user)
                .title(req.title())
                .description(req.description())
                .priceCents(req.isFree() ? 0L : req.priceCents())
                .isFree(req.isFree())
                .category(parseCategory(req.category()))
                .city(req.city())
                .region(req.region())
                .country(req.country())
                .cityText(req.cityText())
                .latitude(req.latitude())
                .longitude(req.longitude())
                .pawStatus(PawListingStatus.Available)
                .status(ListingStatus.ACTIVE)
                .stockQuantity(stock)
                .build();
        listingRepository.save(l);
        return toDto(l);
    }

    @Transactional
    public PawListingDto update(Long id, PawListingUpsertRequest req, SecurityUser principal) {
        MarketListing l = listingRepository.findById(id).orElseThrow();
        assertOwner(l, principal);
        l.setTitle(req.title());
        l.setDescription(req.description());
        l.setFree(req.isFree());
        l.setPriceCents(req.isFree() ? 0L : req.priceCents());
        l.setCategory(parseCategory(req.category()));
        l.setCity(req.city());
        l.setRegion(req.region());
        l.setCountry(req.country());
        l.setCityText(req.cityText());
        l.setLatitude(req.latitude());
        l.setLongitude(req.longitude());

        if (req.stockQuantity() != null) {
            long sold = orderRepository.sumQuantityByListingId(id);
            if (req.stockQuantity() < sold) {
                throw new IllegalArgumentException(
                        "Stock cannot be less than units already sold (" + sold + ").");
            }
            l.setStockQuantity(req.stockQuantity());
        }

        if (aiCatCheckService.isCatCheckEnabled()) {
            String imageUrl = l.getPhotoUrl();
            if ((imageUrl == null || imageUrl.isBlank())
                    && l.getImageUrls() != null
                    && !l.getImageUrls().isEmpty()) {
                imageUrl = l.getImageUrls().get(0);
            }
            if (imageUrl != null && !imageUrl.isBlank()) {
                Optional<byte[]> img;
                try {
                    img = fileStorageService.readByPublicFileUrl(imageUrl);
                } catch (IOException e) {
                    throw new IllegalArgumentException(
                            "Could not read the listing photo for Cat-Check. Try re-uploading the image.");
                }
                if (img.isEmpty()) {
                    throw new IllegalArgumentException(
                            "Listing photo is missing on the server. Re-upload an image before changing text.");
                }
                CatCheckResponse cat = aiCatCheckService.verifyImage(
                        img.get(), mimeTypeForImageUrl(imageUrl), l.getTitle(), l.getDescription());
                if (!cat.isCatRelated()) {
                    throw new AiCatCheckService.CatCheckFailedException(cat.reason());
                }
            }
        }

        return toDto(l);
    }

    private static String mimeTypeForImageUrl(String url) {
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        if (lower.endsWith(".gif")) {
            return "image/gif";
        }
        return "image/jpeg";
    }

    @Transactional(readOnly = true)
    public List<PawListingDto> adminListAll() {
        return listingRepository.findAll().stream()
                .sorted(Comparator.comparing(MarketListing::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed())
                .map(this::toDto)
                .toList();
    }

    /** Admin: update any listing (no ownership check; skips AI cat-check on save). */
    @Transactional
    public PawListingDto adminUpdateListing(Long id, PawListingUpsertRequest req) {
        MarketListing l = listingRepository
                .findById(id)
                .orElseThrow(() -> new NoSuchElementException("Listing not found"));
        l.setTitle(req.title());
        l.setDescription(req.description());
        l.setFree(req.isFree());
        l.setPriceCents(req.isFree() ? 0L : req.priceCents());
        l.setCategory(parseCategory(req.category()));
        l.setCity(req.city());
        l.setRegion(req.region());
        l.setCountry(req.country());
        l.setCityText(req.cityText());
        l.setLatitude(req.latitude());
        l.setLongitude(req.longitude());

        if (req.stockQuantity() != null) {
            long sold = orderRepository.sumQuantityByListingId(id);
            if (req.stockQuantity() < sold) {
                throw new IllegalArgumentException(
                        "Stock cannot be less than units already sold (" + sold + ").");
            }
            l.setStockQuantity(req.stockQuantity());
        }

        return toDto(l);
    }

    /**
     * Admin: remove any listing. DB cascades delete paw_orders and dependent reviews; chat threads keep
     * stale {@code market_listing_id} (nullable long — safe).
     */
    @Transactional
    public void adminForceDeleteListing(Long id) {
        MarketListing l = listingRepository
                .findById(id)
                .orElseThrow(() -> new NoSuchElementException("Listing not found"));
        listingRepository.delete(l);
    }

    /** Removes a listing owned by the caller when it has no orders yet. */
    @Transactional
    public void deleteListing(Long id, SecurityUser principal) {
        MarketListing l = listingRepository.findById(id).orElseThrow();
        assertOwner(l, principal);
        if (l.getPawStatus() != PawListingStatus.Available && l.getPawStatus() != PawListingStatus.Expired) {
            throw new IllegalStateException("Only available or expired listings can be deleted.");
        }
        if (orderRepository.existsByListingId(id)) {
            throw new IllegalStateException("Cannot delete a listing that already has orders.");
        }
        listingRepository.delete(l);
    }

    @Transactional
    public PawListingDto uploadPhoto(Long id, MultipartFile file, SecurityUser principal)
            throws Exception {
        MarketListing l = listingRepository.findById(id).orElseThrow();
        assertOwner(l, principal);

        CatCheckResponse cat = aiCatCheckService.verifyImage(
                file.getBytes(), file.getContentType(), l.getTitle(), l.getDescription());
        if (!cat.isCatRelated()) {
            throw new AiCatCheckService.CatCheckFailedException(cat.reason());
        }

        String url = fileStorageService.store(file, "listing");
        l.getImageUrls().add(url);
        if (l.getPhotoUrl() == null) l.setPhotoUrl(url);
        return toDto(l);
    }

    // ── Buy flow ──────────────────────────────────────────────────────────

    @Transactional
    public PlaceOrderResponse placeOrder(
            Long listingId, PlaceOrderRequest req, SecurityUser principal) {
        MarketListing listing = listingRepository.findByIdForUpdate(listingId).orElseThrow();

        if (listing.getPawStatus() != PawListingStatus.Available) {
            throw new IllegalStateException("This item is no longer available.");
        }
        if (isPastPublicWindow(listing)) {
            throw new IllegalStateException("This listing has expired.");
        }
        if (listing.getStockQuantity() <= 0) {
            throw new IllegalStateException("This item is sold out.");
        }
        if (listing.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("You cannot buy your own listing.");
        }

        int quantity = req.quantity() != null ? req.quantity() : 1;
        if (quantity < 1 || quantity > 999) {
            throw new IllegalArgumentException("Quantity must be between 1 and 999.");
        }
        if (quantity > listing.getStockQuantity()) {
            throw new IllegalStateException(
                    "Not enough in stock (only " + listing.getStockQuantity() + " left).");
        }

        User buyer = userRepository.getReferenceById(principal.getId());
        User seller = listing.getUser();

        return createOrder(listing, buyer, seller, req.buyerPhone(), quantity);
    }

    private PlaceOrderResponse createOrder(
            MarketListing listing, User buyer, User seller, String phone, int quantity) {
        User p1 = buyer.getId() < seller.getId() ? buyer : seller;
        User p2 = buyer.getId() < seller.getId() ? seller : buyer;

        ChatThread thread = chatThreadRepository
                .findListingThread(listing.getId(), buyer.getId(), seller.getId())
                .orElseGet(() -> chatThreadRepository.save(ChatThread.builder()
                        .type(ThreadType.LISTING)
                        .participantOne(p1)
                        .participantTwo(p2)
                        .marketListingId(listing.getId())
                        .build()));

        int newStock = listing.getStockQuantity() - quantity;
        listing.setStockQuantity(newStock);
        if (newStock <= 0) {
            listing.setPawStatus(PawListingStatus.Sold);
            listing.setStatus(ListingStatus.SOLD);
        } else {
            listing.setPawStatus(PawListingStatus.Available);
        }

        PawOrder order = orderRepository.save(PawOrder.builder()
                .listing(listing)
                .buyer(buyer)
                .buyerPhone(phone)
                .quantity(quantity)
                .threadId(thread.getId())
                .build());

        String listingUrl = pawhubProperties.listingPageUrl(listing.getId());
        String qtyNote = quantity > 1 ? " (quantity: " + quantity + ")" : "";
        String body = String.format(
                "\uD83D\uDC3E Meow! %s wants to buy \"%s\"%s. Contact them at %s.\n\nView listing: %s",
                buyer.getDisplayName(), listing.getTitle(), qtyNote, phone, listingUrl);

        Message msg = messageRepository.save(Message.builder()
                .thread(thread)
                .sender(buyer)
                .body(body)
                .build());

        MessageDto dto =
                new MessageDto(msg.getId(), buyer.getId(), msg.getBody(), msg.getCreatedAt(), msg.getAttachmentUrl());
        messagingTemplate.convertAndSend("/topic/threads." + thread.getId(), dto);

        return new PlaceOrderResponse(order.getId(), thread.getId());
    }

    // ── Reviews ───────────────────────────────────────────────────────────

    @Transactional
    public PawReviewDto submitReview(PawReviewRequest req, SecurityUser principal) {
        if (reviewRepository.existsByOrderIdAndReviewerId(req.orderId(), principal.getId())) {
            throw new IllegalStateException("You already reviewed this order.");
        }
        PawOrder order = orderRepository.findById(req.orderId()).orElseThrow();
        if (!order.getBuyer().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Only the buyer can review this order.");
        }

        User reviewer = userRepository.getReferenceById(principal.getId());
        User target = userRepository.findById(req.targetUserId()).orElseThrow();

        PawReview review = reviewRepository.save(PawReview.builder()
                .order(order)
                .reviewer(reviewer)
                .targetUser(target)
                .rating(req.rating())
                .comment(req.comment())
                .build());

        target.setCompletedSales(target.getCompletedSales() + 1);
        checkAndGrantVerifiedMeow(target);

        MarketListing listing = order.getListing();
        if (listing.getStockQuantity() <= 0) {
            listing.setPawStatus(PawListingStatus.Sold);
            listing.setStatus(ListingStatus.SOLD);
        }

        return toReviewDto(review);
    }

    @Transactional(readOnly = true)
    public List<PawReviewDto> getReviews(Long userId) {
        return reviewRepository.findByTargetUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toReviewDto)
                .toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static boolean isPastPublicWindow(MarketListing l) {
        if (l.getCreatedAt() == null) {
            return false;
        }
        return l.getCreatedAt()
                .isBefore(Instant.now().minus(PawListingExpiryJob.PUBLIC_LISTING_DAYS, ChronoUnit.DAYS));
    }

    private void checkAndGrantVerifiedMeow(User seller) {
        if (seller.getCompletedSales() >= 5) {
            double avg = reviewRepository.averageRatingForUser(seller.getId());
            if (avg >= 4.5) seller.setVerifiedMeow(true);
        }
    }

    private void assertOwner(MarketListing l, SecurityUser principal) {
        if (!l.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Not your listing.");
        }
    }

    private static PawCategory parseCategory(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return PawCategory.valueOf(raw);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private PawListingDto toDto(MarketListing l) {
        double avg = reviewRepository.averageRatingForUser(l.getUser().getId());
        long cnt = reviewRepository.countByTargetUserId(l.getUser().getId());
        List<String> imgs = l.getImageUrls() != null ? l.getImageUrls() : List.of();
        long soldQty = orderRepository.sumQuantityByListingId(l.getId());
        String expiresAt = null;
        if (l.getCreatedAt() != null) {
            expiresAt = l.getCreatedAt()
                    .plus(PawListingExpiryJob.PUBLIC_LISTING_DAYS, ChronoUnit.DAYS)
                    .toString();
        }
        return new PawListingDto(
                l.getId(),
                l.getUser().getId(),
                l.getUser().getDisplayName(),
                l.getUser().getAvatarUrl(),
                l.getUser().isVerifiedMeow(),
                l.getUser().getCompletedSales(),
                l.getTitle(),
                l.getDescription(),
                l.getPriceCents(),
                l.isFree(),
                l.getCategory() != null ? l.getCategory().name() : null,
                l.getCity(),
                l.getRegion(),
                l.getCountry(),
                l.getCityText(),
                l.getLatitude(),
                l.getLongitude(),
                l.getPawStatus() != null ? l.getPawStatus().name() : "Available",
                imgs,
                l.getPhotoUrl(),
                avg,
                cnt,
                l.getCreatedAt() != null ? l.getCreatedAt().toString() : null,
                l.getStockQuantity(),
                soldQty,
                expiresAt);
    }

    private PawReviewDto toReviewDto(PawReview r) {
        return new PawReviewDto(
                r.getId(),
                r.getOrder().getId(),
                r.getReviewer().getId(),
                r.getReviewer().getDisplayName(),
                r.getReviewer().getAvatarUrl(),
                r.getTargetUser().getId(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
    }
}
