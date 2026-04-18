# Data model (Flyway V1)

| Table | Purpose |
|-------|---------|
| `users` | Accounts; `role` = `USER` or `ADMIN` |
| `cats` | Cat profiles; `user_id` owner |
| `cat_photos` | Image URLs for a cat |
| `shelters` | Shelter org; `status` = `PENDING` / `APPROVED` / `REJECTED` |
| `swipes` | `(cat_id, target_cat_id)` unique; `direction` LIKE/PASS |
| `chat_threads` | Conversation; optional `market_listing_id`, `match_id`, `adoption_inquiry_id` |
| `paw_matches` | Mutual match; links two cats + `thread_id` |
| `market_listings` | PawMarket listing |
| `adoption_listings` | PawAdopt listing (shelter must be APPROVED) |
| `adoption_inquiries` | One inquiry per `(listing, user)`; owns `thread_id` |
| `messages` | Chat rows; broadcast on insert via STOMP |

## Indexes

See `V1__init.sql` — threads by participant ids, messages by thread, listings by city.
