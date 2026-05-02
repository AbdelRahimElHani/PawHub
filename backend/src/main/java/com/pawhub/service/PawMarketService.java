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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

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
    private final AppNotificationService appNotificationService;

    private void ensureUserAllowedOnPawMarket(SecurityUser principal) {
        if (principal.getUser().getRole() == UserRole.ADMIN) {
            return;
        }
        User u = userRepository.findById(principal.getId()).orElseThrow();
        if (u.isPawMarketBanned()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Your account cannot buy or sell on Paw Market.");
        }
    }

    private static void assertThreadParticipant(ChatThread thread, Long userId) {
        if (!thread.getParticipantOne().getId().equals(userId)
                && !thread.getParticipantTwo().getId().equals(userId)) {
            throw new IllegalArgumentException("Not a participant in this thread.");
        }
    }

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
                                l -> (l.getPawStatus() == PawListingStatus.Available
                                                || l.getPawStatus() == PawListingStatus.Draft)
                                        ? 0
                                        : 1)
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
        ensureUserAllowedOnPawMarket(principal);
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
        return get(id, null);
    }

    @Transactional(readOnly = true)
    public PawListingDto get(Long id, SecurityUser viewer) {
        MarketListing l = listingRepository.findById(id).orElseThrow();
        if (l.getPawStatus() == PawListingStatus.Draft) {
            if (viewer == null || !l.getUser().getId().equals(viewer.getId())) {
                throw new NoSuchElementException("Listing not found");
            }
        }
        return toDto(l);
    }

    // ── Create / Update ───────────────────────────────────────────────────

    @Transactional
    public PawListingDto create(PawListingUpsertRequest req, SecurityUser principal) {
        ensureUserAllowedOnPawMarket(principal);
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
                .pawStatus(PawListingStatus.Draft)
                .status(ListingStatus.ACTIVE)
                .stockQuantity(stock)
                .build();
        listingRepository.save(l);
        return toDto(l);
    }

    /**
     * Second AI step: verify stored image + title + description together, then set status to
     * {@link PawListingStatus#Available} (public browse).
     */
    @Transactional
    public PawListingDto publishToMarket(Long id, SecurityUser principal) {
        ensureUserAllowedOnPawMarket(principal);
        MarketListing l = listingRepository.findById(id).orElseThrow();
        assertOwner(l, principal);
        if (l.getPawStatus() != PawListingStatus.Draft) {
            throw new IllegalStateException(
                    "This listing is not a draft, or is already live. Only drafts can be published here.");
        }
        if (l.getTitle() == null || l.getTitle().isBlank()) {
            throw new IllegalArgumentException("Add a title before publishing.");
        }
        String imageUrl = l.getPhotoUrl();
        if ((imageUrl == null || imageUrl.isBlank()) && l.getImageUrls() != null && !l.getImageUrls().isEmpty()) {
            imageUrl = l.getImageUrls().get(0);
        }
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new IllegalArgumentException("Add a listing photo before publishing.");
        }
        if (aiCatCheckService.isCatCheckEnabled()) {
            try {
                Optional<byte[]> img = fileStorageService.readByPublicFileUrl(imageUrl);
                if (img.isEmpty()) {
                    throw new IllegalArgumentException(
                            "Photo file is missing on the server. Re-upload the image and try again.");
                }
                CatCheckResponse cat =
                        aiCatCheckService.verifyListingTextMatchesImage(
                                img.get(), mimeTypeForImageUrl(imageUrl), l.getTitle(), l.getDescription());
                if (!cat.isCatRelated()) {
                    throw new AiCatCheckService.CatCheckFailedException(cat.reason());
                }
            } catch (IOException e) {
                throw new IllegalArgumentException(
                        "Could not read the photo for matching. Re-upload the image and try again.");
            }
        }
        l.setPawStatus(PawListingStatus.Available);
        return toDto(l);
    }

    @Transactional
    public PawListingDto update(Long id, PawListingUpsertRequest req, SecurityUser principal) {
        ensureUserAllowedOnPawMarket(principal);
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
            long sold = orderRepository.sumQuantityByListingIdAndSellerStatus(id, PawOrderSellerStatus.CONFIRMED);
            if (req.stockQuantity() < sold) {
                throw new IllegalArgumentException(
                        "Stock cannot be less than units already sold (" + sold + ").");
            }
            l.setStockQuantity(req.stockQuantity());
        }

        if (l.getPawStatus() == PawListingStatus.Draft) {
            return toDto(l);
        }
        if (aiCatCheckService.isCatCheckEnabled() && l.getPawStatus() == PawListingStatus.Available) {
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
                CatCheckResponse cat = aiCatCheckService.verifyListingTextMatchesImage(
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
            long sold = orderRepository.sumQuantityByListingIdAndSellerStatus(id, PawOrderSellerStatus.CONFIRMED);
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
    public void adminForceDeleteListing(Long id, AdminRemoveListingRequest req, SecurityUser admin) {
        AdminRemoveListingRequest body = req != null ? req : AdminRemoveListingRequest.defaults();
        MarketListing l = listingRepository
                .findById(id)
                .orElseThrow(() -> new NoSuchElementException("Listing not found"));
        Long sellerId = l.getUser().getId();
        User seller = userRepository.findById(sellerId).orElseThrow();
        String title = l.getTitle() != null ? l.getTitle().trim() : "your listing";
        String titleShort = title.length() > 120 ? title.substring(0, 117) + "…" : title;
        String reason = body.reason() != null && !body.reason().isBlank()
                ? body.reason().trim()
                : "No reason was provided.";
        String reasonShort = reason.length() > 800 ? reason.substring(0, 797) + "…" : reason;

        User adminUser = userRepository.findById(admin.getId()).orElseThrow();
        List<ChatThread> threads =
                chatThreadRepository.findByTypeAndMarketListingId(ThreadType.LISTING, id);
        StringBuilder adminMsg = new StringBuilder(
                "⚠️ Moderation: Your listing \"" + titleShort.replace("\"", "'") + "\" was removed.\nReason: "
                        + reasonShort);
        if (body.warnSeller()) {
            adminMsg.append("\n\nA formal Paw Market warning was recorded on your account.");
        }
        if (body.banSeller()) {
            adminMsg.append("\n\nYour account was banned from Paw Market (you can no longer list or buy items).");
        }
        String adminMsgText = adminMsg.toString();
        Set<Long> postedThreads = new HashSet<>();
        for (ChatThread t : threads) {
            if (!postedThreads.add(t.getId())) {
                continue;
            }
            Message m = messageRepository.save(Message.builder()
                    .thread(t)
                    .sender(adminUser)
                    .body(adminMsgText)
                    .build());
            MessageDto dto = new MessageDto(
                    m.getId(),
                    adminUser.getId(),
                    m.getBody(),
                    m.getCreatedAt(),
                    m.getAttachmentUrl());
            messagingTemplate.convertAndSend("/topic/threads." + t.getId(), dto);
        }

        listingRepository.delete(l);

        String notifBody = "Your listing \""
                + titleShort.replace("\"", "'")
                + "\" was removed by an administrator. Reason: "
                + reasonShort;
        appNotificationService.publishWithInboxNudge(
                sellerId,
                AppNotificationKind.MARKET_LISTING_REMOVED_ADMIN,
                "Listing removed by admin",
                notifBody,
                "/market",
                "package",
                null);

        if (body.warnSeller()) {
            appNotificationService.publishWithInboxNudge(
                    sellerId,
                    AppNotificationKind.ADMIN_PAW_MARKET_USER_WARNED,
                    "Paw Market warning",
                    "A moderator issued a warning related to your Paw Market activity. Reason: "
                            + reasonShort,
                    "/market",
                    "urgent",
                    null);
        }
        if (body.banSeller()) {
            seller.setPawMarketBanned(true);
            userRepository.save(seller);
            appNotificationService.publishWithInboxNudge(
                    sellerId,
                    AppNotificationKind.ADMIN_PAW_MARKET_USER_BANNED,
                    "Banned from Paw Market",
                    "Your account can no longer list or buy items on Paw Market. Reason: " + reasonShort,
                    "/market",
                    "urgent",
                    null);
        }
    }

    /** Removes a listing owned by the caller when it has no orders yet. */
    @Transactional
    public void deleteListing(Long id, SecurityUser principal) {
        ensureUserAllowedOnPawMarket(principal);
        MarketListing l = listingRepository.findById(id).orElseThrow();
        assertOwner(l, principal);
        if (l.getPawStatus() != PawListingStatus.Available
                && l.getPawStatus() != PawListingStatus.Expired
                && l.getPawStatus() != PawListingStatus.Draft) {
            throw new IllegalStateException("This listing cannot be deleted.");
        }
        if (orderRepository.existsByListingId(id)) {
            throw new IllegalStateException("Cannot delete a listing that already has orders.");
        }
        listingRepository.delete(l);
    }

    @Transactional
    public PawListingDto uploadPhoto(Long id, MultipartFile file, SecurityUser principal)
            throws Exception {
        ensureUserAllowedOnPawMarket(principal);
        MarketListing l = listingRepository.findById(id).orElseThrow();
        assertOwner(l, principal);

        CatCheckResponse cat = aiCatCheckService.verifyImageCatOnly(file.getBytes(), file.getContentType());
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
        ensureUserAllowedOnPawMarket(principal);
        MarketListing listing = listingRepository.findByIdForUpdate(listingId).orElseThrow();

        if (userRepository.findById(listing.getUser().getId()).orElseThrow().isPawMarketBanned()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "This seller cannot accept orders on Paw Market.");
        }

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

        PawOrder order = orderRepository.save(PawOrder.builder()
                .listing(listing)
                .buyer(buyer)
                .buyerPhone(phone)
                .quantity(quantity)
                .threadId(thread.getId())
                .sellerStatus(PawOrderSellerStatus.PENDING_SELLER)
                .build());

        String listingUrl = pawhubProperties.listingPageUrl(listing.getId());
        String qtyNote = quantity > 1 ? " (quantity: " + quantity + ")" : "";
        String body = String.format(
                "\uD83D\uDC3E Meow! %s wants to buy \"%s\"%s. Contact them at %s.\n\nView listing: %s\n\n"
                        + "Seller: confirm this sale, adjust quantity, or decline — stock is not deducted until you confirm.",
                buyer.getDisplayName(), listing.getTitle(), qtyNote, phone, listingUrl);

        Message msg = messageRepository.save(Message.builder()
                .thread(thread)
                .sender(buyer)
                .body(body)
                .build());

        MessageDto dto =
                new MessageDto(msg.getId(), buyer.getId(), msg.getBody(), msg.getCreatedAt(), msg.getAttachmentUrl());
        messagingTemplate.convertAndSend("/topic/threads." + thread.getId(), dto);

        appNotificationService.publish(
                seller.getId(),
                AppNotificationKind.MARKET_ORDER_SELLER,
                "New Paw Market order",
                String.format("%s placed an order for \"%s\".", buyer.getDisplayName(), listing.getTitle()),
                "/messages/" + thread.getId(),
                "package",
                buyer.getAvatarUrl());
        appNotificationService.publish(
                buyer.getId(),
                AppNotificationKind.MARKET_ORDER_BUYER,
                "Order placed",
                String.format(
                        "Your order for \"%s\" is pending — the seller must confirm before stock is reserved.",
                        listing.getTitle()),
                "/messages/" + thread.getId(),
                "package",
                null);

        return new PlaceOrderResponse(order.getId(), thread.getId());
    }

    @Transactional(readOnly = true)
    public List<PawMarketReviewPromptDto> listBuyerReviewPrompts(SecurityUser principal) {
        if (principal.getUser().getRole() == UserRole.ADMIN) {
            return List.of();
        }
        List<PawOrder> orders =
                orderRepository.findByBuyerIdAndSellerStatusOrderByCreatedAtDesc(principal.getId(), PawOrderSellerStatus.CONFIRMED);
        return orders.stream()
                .filter(o -> !reviewRepository.existsByOrderIdAndReviewerId(o.getId(), principal.getId()))
                .map(o -> {
                    MarketListing l = o.getListing();
                    return new PawMarketReviewPromptDto(
                            o.getId(),
                            l.getId(),
                            l.getTitle() != null ? l.getTitle() : "Purchase",
                            l.getUser().getId(),
                            l.getUser().getDisplayName(),
                            o.getThreadId());
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public PawMarketOrderThreadDto getMarketOrderForThread(Long threadId, SecurityUser viewer) {
        ChatThread thread = chatThreadRepository.findById(threadId).orElseThrow();
        assertThreadParticipant(thread, viewer.getId());
        Optional<PawOrder> opt = orderRepository.findFirstByThreadIdOrderByCreatedAtDesc(threadId);
        if (opt.isEmpty()) {
            return new PawMarketOrderThreadDto(null, null, null, 0, null, false, false, false);
        }
        PawOrder order = opt.get();
        MarketListing listing = order.getListing();
        boolean isBuyer = order.getBuyer().getId().equals(viewer.getId());
        boolean isSeller = listing.getUser().getId().equals(viewer.getId());
        boolean canReview = isBuyer
                && order.getSellerStatus() == PawOrderSellerStatus.CONFIRMED
                && !reviewRepository.existsByOrderIdAndReviewerId(order.getId(), viewer.getId());
        return new PawMarketOrderThreadDto(
                order.getId(),
                listing.getId(),
                listing.getTitle(),
                order.getQuantity(),
                order.getSellerStatus().name(),
                isBuyer,
                isSeller,
                canReview);
    }

    @Transactional
    public PawMarketOrderThreadDto sellerConfirmOrder(Long orderId, SecurityUser principal) {
        ensureUserAllowedOnPawMarket(principal);
        PawOrder order = orderRepository.findById(orderId).orElseThrow();
        MarketListing listing = listingRepository.findByIdForUpdate(order.getListing().getId()).orElseThrow();
        if (!listing.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Only the seller can confirm this order.");
        }
        if (order.getSellerStatus() != PawOrderSellerStatus.PENDING_SELLER) {
            throw new IllegalStateException("This order is not awaiting confirmation.");
        }
        int qty = order.getQuantity();
        if (listing.getStockQuantity() < qty) {
            throw new IllegalStateException(
                    "Not enough stock remains to confirm this order (only " + listing.getStockQuantity() + " left).");
        }
        int newStock = listing.getStockQuantity() - qty;
        listing.setStockQuantity(newStock);
        if (newStock <= 0) {
            listing.setPawStatus(PawListingStatus.Sold);
            listing.setStatus(ListingStatus.SOLD);
        } else {
            listing.setPawStatus(PawListingStatus.Available);
        }
        listingRepository.save(listing);
        order.setSellerStatus(PawOrderSellerStatus.CONFIRMED);
        orderRepository.save(order);
        ChatThread thread = chatThreadRepository.findById(order.getThreadId()).orElseThrow();
        User seller = userRepository.getReferenceById(principal.getId());
        String body = "✅ " + seller.getDisplayName() + " confirmed this Paw Market order.";
        Message msg = messageRepository.save(Message.builder()
                .thread(thread)
                .sender(seller)
                .body(body)
                .build());
        MessageDto dto = new MessageDto(
                msg.getId(), seller.getId(), msg.getBody(), msg.getCreatedAt(), msg.getAttachmentUrl());
        messagingTemplate.convertAndSend("/topic/threads." + thread.getId(), dto);
        return getMarketOrderForThread(thread.getId(), principal);
    }

    @Transactional
    public void sellerDeclineOrder(Long orderId, SecurityUser principal) {
        ensureUserAllowedOnPawMarket(principal);
        PawOrder order = orderRepository.findById(orderId).orElseThrow();
        MarketListing listing = order.getListing();
        if (!listing.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Only the seller can decline this order.");
        }
        if (order.getSellerStatus() != PawOrderSellerStatus.PENDING_SELLER) {
            throw new IllegalStateException("This order is not awaiting confirmation.");
        }
        Long tid = order.getThreadId();
        User seller = userRepository.getReferenceById(principal.getId());
        orderRepository.delete(order);
        ChatThread thread = chatThreadRepository.findById(tid).orElseThrow();
        String body = "❌ " + seller.getDisplayName()
                + " declined this Paw Market offer. No stock was deducted.";
        Message msg = messageRepository.save(Message.builder()
                .thread(thread)
                .sender(seller)
                .body(body)
                .build());
        MessageDto dto = new MessageDto(
                msg.getId(), seller.getId(), msg.getBody(), msg.getCreatedAt(), msg.getAttachmentUrl());
        messagingTemplate.convertAndSend("/topic/threads." + thread.getId(), dto);
    }

    @Transactional
    public PawMarketOrderThreadDto sellerUpdateOrderQuantity(
            Long orderId, int newQuantity, SecurityUser principal) {
        ensureUserAllowedOnPawMarket(principal);
        if (newQuantity < 1 || newQuantity > 999) {
            throw new IllegalArgumentException("Quantity must be between 1 and 999.");
        }
        PawOrder order = orderRepository.findById(orderId).orElseThrow();
        MarketListing listing = listingRepository.findByIdForUpdate(order.getListing().getId()).orElseThrow();
        if (!listing.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Only the seller can change order quantity.");
        }
        if (order.getSellerStatus() != PawOrderSellerStatus.PENDING_SELLER) {
            throw new IllegalStateException("Quantity can only be changed while the order awaits confirmation.");
        }
        int old = order.getQuantity();
        if (newQuantity == old) {
            return getMarketOrderForThread(order.getThreadId(), principal);
        }
        if (newQuantity > listing.getStockQuantity()) {
            throw new IllegalArgumentException(
                    "Quantity cannot exceed current stock (" + listing.getStockQuantity() + ").");
        }
        order.setQuantity(newQuantity);
        orderRepository.save(order);
        ChatThread thread = chatThreadRepository.findById(order.getThreadId()).orElseThrow();
        User seller = userRepository.getReferenceById(principal.getId());
        String body = "📦 " + seller.getDisplayName() + " updated this order to quantity " + newQuantity + ".";
        Message msg = messageRepository.save(Message.builder()
                .thread(thread)
                .sender(seller)
                .body(body)
                .build());
        MessageDto dto = new MessageDto(
                msg.getId(), seller.getId(), msg.getBody(), msg.getCreatedAt(), msg.getAttachmentUrl());
        messagingTemplate.convertAndSend("/topic/threads." + thread.getId(), dto);
        return getMarketOrderForThread(order.getThreadId(), principal);
    }

    // ── Reviews ───────────────────────────────────────────────────────────

    @Transactional
    public PawReviewDto submitReview(PawReviewRequest req, SecurityUser principal) {
        ensureUserAllowedOnPawMarket(principal);
        if (reviewRepository.existsByOrderIdAndReviewerId(req.orderId(), principal.getId())) {
            throw new IllegalStateException("You already reviewed this order.");
        }
        PawOrder order = orderRepository.findById(req.orderId()).orElseThrow();
        if (!order.getBuyer().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Only the buyer can review this order.");
        }
        if (order.getSellerStatus() != PawOrderSellerStatus.CONFIRMED) {
            throw new IllegalStateException("The seller must confirm this order before you can leave a review.");
        }
        if (!order.getListing().getUser().getId().equals(req.targetUserId())) {
            throw new IllegalArgumentException("Reviews must be for the seller of this order.");
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
        long soldQty = orderRepository.sumQuantityByListingIdAndSellerStatus(l.getId(), PawOrderSellerStatus.CONFIRMED);
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
