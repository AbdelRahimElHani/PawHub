# Data model (Flyway V1)

| Table | Purpose |
|-------|---------|
| `users` | Accounts; `role` = `USER` or `ADMIN`; `email_verified`, optional `email_verification_token` + expiry (V13) |
| `cats` | Cat profiles; `user_id` owner; PawMatch: gender/age prefs (V11), `behavior` + `pref_behavior` + `pref_breed` (V12) |
| `cat_photos` | Image URLs for a cat |
| `shelters` | Shelter org; `status` = `PENDING` / `APPROVED` / `REJECTED` |
| `swipes` | `(cat_id, target_cat_id)` unique; `direction` LIKE/PASS |
| `chat_threads` | Conversation; `type` includes `MATCH`, `LISTING`, `ADOPTION`, `DIRECT` (user DM); optional `market_listing_id`, `match_id`, `adoption_inquiry_id` |
| `paw_matches` | Mutual match; links two cats + `thread_id` |
| `market_listings` | PawMarket listing; extended with `category`, `is_free`, `latitude`, `longitude`, `city_text`, `paw_status` |
| `market_listing_images` | Multiple image URLs per listing |
| `paw_orders` | Buy-flow orders; links listing + buyer + chat thread |
| `paw_reviews` | Seller reviews left by buyers after order completion |
| `adoption_listings` | PawAdopt listing (shelter must be APPROVED) |
| `adoption_inquiries` | One inquiry per `(listing, user)`; owns `thread_id` |
| `messages` | Chat rows (`body`, optional `attachment_url`); broadcast on insert via STOMP |

## Indexes

See `V1__init.sql` — threads by participant ids, messages by thread, listings by city.
