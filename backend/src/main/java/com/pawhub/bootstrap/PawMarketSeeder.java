package com.pawhub.bootstrap;

import com.pawhub.domain.*;
import com.pawhub.repository.*;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds rich Paw Market demo data: 6 users, 14 listings (all categories),
 * 5 orders, 6 reviews, and 2 Verified Meow sellers.
 * Runs once — skipped if luna@pawhub.local already exists.
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class PawMarketSeeder implements CommandLineRunner {

    private final UserRepository         userRepo;
    private final MarketListingRepository listingRepo;
    private final PawOrderRepository      orderRepo;
    private final PawReviewRepository     reviewRepo;
    private final ChatThreadRepository    threadRepo;
    private final MessageRepository       messageRepo;
    private final PasswordEncoder         passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepo.existsByEmailIgnoreCase("luna@pawhub.local")) {
            log.info("Paw Market seed data already present – skipping.");
            return;
        }

        log.info("Seeding Paw Market demo data…");
        String pw = passwordEncoder.encode("cat1234");

        // ── Users ─────────────────────────────────────────────────────────

        User luna = user(pw, "Luna Pawsworth",   "luna@pawhub.local",    "New York",     "NY",
                "Cat behaviour coach & passionate feline curator. 🐾",
                "https://api.dicebear.com/8.x/adventurer/svg?seed=Luna");
        luna.setVerifiedMeow(true);
        luna.setCompletedSales(6);
        luna = userRepo.save(luna);

        User oliver = user(pw, "Oliver Whisker",  "oliver@pawhub.local",  "Los Angeles",  "CA",
                "PawHub veteran seller. Every item is hand-picked for the discerning cat.",
                "https://api.dicebear.com/8.x/adventurer/svg?seed=Oliver");
        oliver.setVerifiedMeow(true);
        oliver.setCompletedSales(9);
        oliver = userRepo.save(oliver);

        User mochi = user(pw, "Mochi Purrington",  "mochi@pawhub.local",   "Chicago",      "IL",
                "Cat mum of 3. Decluttering our cat room! 😸",
                "https://api.dicebear.com/8.x/adventurer/svg?seed=Mochi");
        mochi.setCompletedSales(2);
        mochi = userRepo.save(mochi);

        User simba = user(pw, "Simba Clawson",     "simba@pawhub.local",   "Austin",       "TX",
                "DIY cat furniture enthusiast. Retired items that deserve a new home.",
                "https://api.dicebear.com/8.x/adventurer/svg?seed=Simba");
        simba.setCompletedSales(3);
        simba = userRepo.save(simba);

        User nala = user(pw, "Nala Pounce",       "nala@pawhub.local",    "Seattle",      "WA",
                "Vet tech | Cat health advocate | Sustainable pet parent 🌿",
                "https://api.dicebear.com/8.x/adventurer/svg?seed=Nala");
        nala.setCompletedSales(4);
        nala = userRepo.save(nala);

        User chester = user(pw, "Chester Meow",   "chester@pawhub.local", "Miami",        "FL",
                "Buyer only. Two rescue cats, always looking for quality gear.",
                "https://api.dicebear.com/8.x/adventurer/svg?seed=Chester");
        chester = userRepo.save(chester);

        // ── Listings ──────────────────────────────────────────────────────

        // LUNA — New York
        MarketListing l1 = listing(luna,
                "Royal Canin Indoor Adult Cat Food 4kg",
                "Premium dry food for indoor cats. Reduces hairballs and odour. " +
                "Opened once; cat prefers wet food now. Best before Dec 2025.",
                3599, false, PawCategory.Food, "New York", "NY",
                "Midtown, Manhattan", 40.7589, -73.9851,
                List.of(
                  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600",
                  "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=600"),
                1);

        MarketListing l2 = listing(luna,
                "Deluxe Window-Mount Cat Hammock",
                "Sturdy suction-cup hammock, holds up to 15 kg. My cat moved to the sofa " +
                "but this is in perfect condition. Fits windows 20–60 cm wide.",
                4999, false, PawCategory.Furniture, "New York", "NY",
                "Brooklyn, NY", 40.6892, -73.9442,
                List.of(
                  "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=600",
                  "https://images.unsplash.com/photo-1511275539165-cc46b1ee89bf?w=600"),
                3);

        MarketListing l3 = listing(luna,
                "Interactive Feather Wand Bundle (5 wands)",
                "Set of 5 feather wands in different sizes. Cats go crazy for these! " +
                "Giving away — just pay nothing. Purrfect for kittens.",
                0, true, PawCategory.Toys, "New York", "NY",
                "Upper East Side, Manhattan", 40.7736, -73.9566,
                List.of("https://images.unsplash.com/photo-1615789591457-74a63395c990?w=600"),
                1);

        // OLIVER — Los Angeles
        MarketListing l4 = listing(oliver,
                "Organic Freeze-Dried Cat Treats – Salmon & Chicken",
                "100% natural, no fillers. 3 sealed bags × 80g. Great for training. " +
                "Shelf life 18 months from today.",
                1899, false, PawCategory.Food, "Los Angeles", "CA",
                "Santa Monica, CA", 34.0195, -118.4912,
                List.of(
                  "https://images.unsplash.com/photo-1607923432780-7a9c30adcb73?w=600",
                  "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600"),
                1);

        MarketListing l5 = listing(oliver,
                "Corner Self-Grooming Brush (wall-mount)",
                "Cats rub against it to groom themselves. Reduces shedding by 40%. " +
                "Used 6 months, cleaned and sanitised. Infused catnip refill included.",
                2499, false, PawCategory.Health, "Los Angeles", "CA",
                "Silver Lake, LA", 34.0868, -118.2702,
                List.of("https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=600"),
                1);

        MarketListing l6 = listing(oliver,
                "Plush Donut Cat Cave Bed – Washable",
                "Luxury faux-fur donut bed, 55 cm diameter. Machine washable cover. " +
                "My senior cat passed so this is now surplus — pristine condition.",
                6500, false, PawCategory.Furniture, "Los Angeles", "CA",
                "West Hollywood, CA", 34.0900, -118.3617,
                List.of(
                  "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600",
                  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=600"),
                3);

        MarketListing l7 = listing(oliver,
                "Handcrafted Leather Cat Collar + Gold Bell",
                "Genuine leather, adjustable 22–32 cm. Safety breakaway clasp. " +
                "Engraving on request. From a small local artisan.",
                1299, false, PawCategory.Apparel, "Los Angeles", "CA",
                "Venice Beach, CA", 33.9850, -118.4695,
                List.of("https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600"),
                1);

        // MOCHI — Chicago
        MarketListing l8 = listing(mochi,
                "Catnip-Stuffed Mice Set (10 pack)",
                "Organic catnip inside each mouse. Different colours and textures. " +
                "Bought 3 packs for my cats but they only play with 2 at a time. Sealed.",
                999, false, PawCategory.Toys, "Chicago", "IL",
                "Wicker Park, Chicago", 41.9087, -87.6774,
                List.of(
                  "https://images.unsplash.com/photo-1625794084867-8ddd239946b1?w=600",
                  "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600"),
                1);

        MarketListing l9 = listing(mochi,
                "Ceramic Elevated Cat Bowl Set (raised stand)",
                "Raised stand reduces neck strain. Dishwasher-safe ceramic bowls. " +
                "Set of 2. Minimalist white design goes with any kitchen.",
                3499, false, PawCategory.Food, "Chicago", "IL",
                "Lincoln Park, Chicago", 41.9217, -87.6383,
                List.of("https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600"),
                1);

        // SIMBA — Austin
        MarketListing l10 = listing(simba,
                "Adjustable Cat Harness + Retractable Leash",
                "Escape-proof figure-8 harness, size M (4–6 kg). Padded for comfort. " +
                "Includes 5-metre retractable leash. Used twice, cat refused 😂.",
                2199, false, PawCategory.Apparel, "Austin", "TX",
                "South Congress, Austin", 30.2500, -97.7488,
                List.of("https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600"),
                2);

        MarketListing l11 = listing(simba,
                "Automated Laser Cat Toy – 360° rotation",
                "Plugs into USB. 3 speed settings, auto shut-off after 15 min. " +
                "Barely used — we got a second cat and they play with each other now!",
                0, true, PawCategory.Toys, "Austin", "TX",
                "East Austin, TX", 30.2623, -97.7151,
                List.of("https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600"),
                1);

        // NALA — Seattle
        MarketListing l12 = listing(nala,
                "Veterinary-Grade Cat Dental Gel Kit",
                "3-piece kit: enzymatic gel, dual-head brush, finger brush. " +
                "As recommended by vets. Helps prevent gingivitis. Unopened kit.",
                1699, false, PawCategory.Health, "Seattle", "WA",
                "Capitol Hill, Seattle", 47.6235, -122.3208,
                List.of("https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600"),
                1);

        MarketListing l13 = listing(nala,
                "Cat Water Fountain – Silent Pump, 2.5L",
                "Whisper-quiet pump. Carbon filter included (6 spare filters). " +
                "Keeps water oxygenated and fresh. Thoroughly cleaned and disinfected.",
                4500, false, PawCategory.Health, "Seattle", "WA",
                "Fremont, Seattle", 47.6511, -122.3496,
                List.of(
                  "https://images.unsplash.com/photo-1596854273338-cbf078ec7071?w=600",
                  "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=600"),
                1);

        MarketListing l14 = listing(nala,
                "Luxury Cat Backpack Carrier – Bubble Window",
                "Airline-friendly, bubble window for curious cats. " +
                "Ventilated sides, fleece mat inside. Up to 7 kg. Used 4× — like new.",
                8999, false, PawCategory.Other, "Seattle", "WA",
                "Queen Anne, Seattle", 47.6365, -122.3565,
                List.of("https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600"),
                1);

        // ── Orders (5) — some sold out, one multi-unit still in stock ───────
        // Chester buys from Luna (l1 — cat food) → Sold out
        PawOrder o1 = createOrder(l1, chester, luna, "+1-305-555-0101",
                "🐾 Meow! Chester Meow wants to buy \"Royal Canin Indoor Adult Cat Food 4kg\". " +
                "Contact them at +1-305-555-0101.");

        // Chester buys from Oliver (l5 — grooming brush) → Sold out
        PawOrder o2 = createOrder(l5, chester, oliver, "+1-305-555-0101",
                "🐾 Meow! Chester Meow wants to buy \"Corner Self-Grooming Brush\". " +
                "Contact them at +1-305-555-0101.");

        // Mochi buys from Nala (l13 — fountain) → Sold out
        PawOrder o3 = createOrder(l13, mochi, nala, "+1-312-555-0202",
                "🐾 Meow! Mochi Purrington wants to buy \"Cat Water Fountain\". " +
                "Contact them at +1-312-555-0202.");

        // Chester buys from Simba (l10 — harness, stock was 2) → 1 left, still Available
        PawOrder o4 = createOrder(l10, chester, simba, "+1-305-555-0101",
                "🐾 Meow! Chester Meow wants to buy \"Adjustable Cat Harness + Retractable Leash\". " +
                "Contact them at +1-305-555-0101.");

        // Simba buys from Nala (l12 — dental kit) → Sold out
        PawOrder o5 = createOrder(l12, simba, nala, "+1-512-555-0303",
                "🐾 Meow! Simba Clawson wants to buy \"Veterinary-Grade Cat Dental Gel Kit\". " +
                "Contact them at +1-512-555-0303.");

        // ── Reviews ───────────────────────────────────────────────────────
        review(o1, chester, luna, 5,
                "Lightning-fast response, food was exactly as described. Luna is the best seller on PawMarket! 🐾");
        review(o2, chester, oliver, 5,
                "Oliver communicates perfectly. The brush arrived spotless. My cats are obsessed with it!");
        review(o3, mochi, nala, 5,
                "The fountain works perfectly. Nala even included the extra filters. Absolute gem of a seller.");
        review(o5, simba, nala, 4,
                "Dental kit was sealed as promised. Fast shipping. Would buy from Nala again.");

        // Older reviews that established verified meow status for Luna & Oliver
        // (simulated — create extra orders + reviews for their backstory)
        for (int i = 0; i < 2; i++) {
            l2.setStockQuantity(l2.getStockQuantity() - 1);
            listingRepo.save(l2);
            PawOrder extraO = orderRepo.save(PawOrder.builder()
                    .listing(l2)
                    .buyer(chester)
                    .buyerPhone("+1-305-555-0000")
                    .quantity(1)
                    .threadId(o1.getThreadId())
                    .build());
            PawReview extraR = PawReview.builder()
                    .order(extraO)
                    .reviewer(chester)
                    .targetUser(luna)
                    .rating(5)
                    .comment("Always a pleasure buying from Luna.")
                    .build();
            reviewRepo.save(extraR);

            l6.setStockQuantity(l6.getStockQuantity() - 1);
            listingRepo.save(l6);
            PawOrder extraO2 = orderRepo.save(PawOrder.builder()
                    .listing(l6)
                    .buyer(mochi)
                    .buyerPhone("+1-312-555-0000")
                    .quantity(1)
                    .threadId(o2.getThreadId())
                    .build());
            PawReview extraR2 = PawReview.builder()
                    .order(extraO2)
                    .reviewer(mochi)
                    .targetUser(oliver)
                    .rating(5)
                    .comment("Oliver packs items carefully. Five stars every time.")
                    .build();
            reviewRepo.save(extraR2);
        }

        log.info("✅ Paw Market seeded: 6 users | 14 listings | 5 orders | 6+ reviews | 2 Verified Meow sellers");
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private User user(String pw, String name, String email,
                      String city, String region, String bio, String avatar) {
        return User.builder()
                .email(email)
                .passwordHash(pw)
                .displayName(name)
                .accountType(UserAccountType.CAT_OWNER)
                .role(UserRole.USER)
                .profileCity(city)
                .profileRegion(region)
                .profileBio(bio)
                .avatarUrl(avatar)
                .build();
    }

    private MarketListing listing(User seller, String title, String description,
                                   long priceCents, boolean isFree,
                                   PawCategory category,
                                   String city, String region, String cityText,
                                   double lat, double lng,
                                   List<String> images,
                                   int stockQuantity) {
        MarketListing l = MarketListing.builder()
                .user(seller)
                .title(title)
                .description(description)
                .priceCents(isFree ? 0 : priceCents)
                .isFree(isFree)
                .category(category)
                .city(city)
                .region(region)
                .cityText(cityText)
                .latitude(lat)
                .longitude(lng)
                .pawStatus(PawListingStatus.Available)
                .status(ListingStatus.ACTIVE)
                .stockQuantity(stockQuantity)
                .photoUrl(images.isEmpty() ? null : images.get(0))
                .build();
        l = listingRepo.save(l);
        l.getImageUrls().addAll(images);
        return listingRepo.save(l);
    }

    private PawOrder createOrder(MarketListing listing, User buyer, User seller, String phone, String msg) {
        User p1 = buyer.getId() < seller.getId() ? buyer : seller;
        User p2 = buyer.getId() < seller.getId() ? seller : buyer;

        ChatThread thread = threadRepo.save(ChatThread.builder()
                .type(ThreadType.LISTING)
                .participantOne(p1)
                .participantTwo(p2)
                .marketListingId(listing.getId())
                .build());

        messageRepo.save(Message.builder()
                .thread(thread)
                .sender(buyer)
                .body(msg)
                .build());

        int qty = 1;
        int newStock = listing.getStockQuantity() - qty;
        listing.setStockQuantity(newStock);
        if (newStock <= 0) {
            listing.setPawStatus(PawListingStatus.Sold);
            listing.setStatus(ListingStatus.SOLD);
        } else {
            listing.setPawStatus(PawListingStatus.Available);
        }
        listingRepo.save(listing);

        return orderRepo.save(PawOrder.builder()
                .listing(listing)
                .buyer(buyer)
                .buyerPhone(phone)
                .quantity(qty)
                .threadId(thread.getId())
                .build());
    }

    private void review(PawOrder order, User reviewer, User target, int rating, String comment) {
        reviewRepo.save(PawReview.builder()
                .order(order)
                .reviewer(reviewer)
                .targetUser(target)
                .rating(rating)
                .comment(comment)
                .build());
        target.setCompletedSales(target.getCompletedSales() + 1);
        userRepo.save(target);
    }
}
