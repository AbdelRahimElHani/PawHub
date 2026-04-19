package com.pawhub.service;

import com.pawhub.config.PawhubProperties;
import com.pawhub.domain.*;
import com.pawhub.repository.ChatThreadRepository;
import com.pawhub.repository.MarketListingRepository;
import com.pawhub.repository.MessageRepository;
import com.pawhub.repository.UserRepository;
import com.pawhub.security.SecurityUser;
import com.pawhub.web.dto.MarketListingDto;
import com.pawhub.web.dto.MarketListingUpsertRequest;
import com.pawhub.web.dto.MessageDto;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class MarketService {

    private final MarketListingRepository listingRepository;
    private final ChatThreadRepository chatThreadRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final com.pawhub.repository.CatRepository catRepository;
    private final MessageRepository messageRepository;
    private final PawhubProperties pawhubProperties;
    private final SimpMessagingTemplate messagingTemplate;

    public List<MarketListingDto> browse(String city, String region) {
        return listingRepository.searchActive(emptyToNull(city), emptyToNull(region)).stream()
                .map(this::toDto)
                .toList();
    }

    public List<MarketListingDto> mine(SecurityUser principal) {
        return listingRepository.findByUserIdOrderByCreatedAtDesc(principal.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    public MarketListingDto get(Long id) {
        return listingRepository.findById(id).map(this::toDto).orElseThrow();
    }

    @Transactional
    public MarketListingDto create(MarketListingUpsertRequest req, SecurityUser principal) {
        User user = userRepository.getReferenceById(principal.getId());
        Cat cat = req.catId() != null ? catRepository.findById(req.catId()).orElse(null) : null;
        if (cat != null && !cat.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Not your cat");
        }
        MarketListing l = MarketListing.builder()
                .user(user)
                .cat(cat)
                .title(req.title())
                .description(req.description())
                .priceCents(req.priceCents())
                .city(req.city())
                .region(req.region())
                .status(ListingStatus.ACTIVE)
                .build();
        listingRepository.save(l);
        return toDto(l);
    }

    @Transactional
    public MarketListingDto update(Long id, MarketListingUpsertRequest req, SecurityUser principal) {
        MarketListing l = listingRepository.findById(id).orElseThrow();
        if (!l.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Not your listing");
        }
        Cat cat = req.catId() != null ? catRepository.findById(req.catId()).orElse(null) : null;
        if (cat != null && !cat.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Not your cat");
        }
        l.setTitle(req.title());
        l.setDescription(req.description());
        l.setPriceCents(req.priceCents());
        l.setCity(req.city());
        l.setRegion(req.region());
        l.setCat(cat);
        return toDto(l);
    }

    @Transactional
    public MarketListingDto uploadPhoto(Long id, MultipartFile photo, SecurityUser principal) throws Exception {
        MarketListing l = listingRepository.findById(id).orElseThrow();
        if (!l.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Not your listing");
        }
        l.setPhotoUrl(fileStorageService.store(photo, "listing"));
        return toDto(l);
    }

    @Transactional
    public Long openOrGetListingThread(Long listingId, SecurityUser principal) {
        MarketListing listing = listingRepository.findById(listingId).orElseThrow();
        if (listing.getUser().getId().equals(principal.getId())) {
            throw new IllegalArgumentException("Cannot message yourself");
        }
        User buyer = userRepository.getReferenceById(principal.getId());
        User seller = listing.getUser();
        User p1 = buyer.getId() < seller.getId() ? buyer : seller;
        User p2 = buyer.getId() < seller.getId() ? seller : buyer;
        ChatThread thread = chatThreadRepository
                .findListingThread(listingId, buyer.getId(), seller.getId())
                .orElseGet(
                        () -> {
                            ChatThread t = ChatThread.builder()
                                    .type(ThreadType.LISTING)
                                    .participantOne(p1)
                                    .participantTwo(p2)
                                    .marketListingId(listingId)
                                    .build();
                            return chatThreadRepository.save(t);
                        });

        if (messageRepository.countByThreadId(thread.getId()) == 0) {
            String listingUrl = pawhubProperties.listingPageUrl(listing.getId());
            String intro = String.format(
                    "\uD83D\uDC3E %s is reaching out about your listing \"%s\".\n\nView listing: %s",
                    buyer.getDisplayName(), listing.getTitle(), listingUrl);
            Message msg = Message.builder()
                    .thread(thread)
                    .sender(buyer)
                    .body(intro)
                    .build();
            messageRepository.save(msg);
            MessageDto dto = new MessageDto(
                    msg.getId(),
                    buyer.getId(),
                    msg.getBody(),
                    msg.getCreatedAt(),
                    msg.getAttachmentUrl());
            messagingTemplate.convertAndSend("/topic/threads." + thread.getId(), dto);
        }

        return thread.getId();
    }

    private MarketListingDto toDto(MarketListing l) {
        return new MarketListingDto(
                l.getId(),
                l.getUser().getId(),
                l.getCat() != null ? l.getCat().getId() : null,
                l.getTitle(),
                l.getDescription(),
                l.getPriceCents(),
                l.getCity(),
                l.getRegion(),
                l.getStatus().name(),
                l.getPhotoUrl(),
                l.getUser().getDisplayName());
    }

    private static String emptyToNull(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        return s.trim();
    }
}
