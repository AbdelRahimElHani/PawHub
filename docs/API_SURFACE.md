# API surface (index)

OpenAPI: `http://localhost:8080/v3/api-docs` — Swagger UI: `/swagger`.

## Auth

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Bearer |

## Auth

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/register` | Returns `{ message, email, verificationRequired }` — no JWT until verified (unless dev auto-verify is on). |
| GET | `/api/auth/verify-email?token=` | Completes email verification; public. |
| POST | `/api/auth/resend-verification` | Body `{ "email" }`; public; generic response to limit enumeration. |
| POST | `/api/auth/login` | 403 if email not verified. |
| GET | `/api/auth/me` | JWT; `emailVerified` on user payload. |

## Cats

Cat JSON includes PawMatch fields: `prefLookingForGender` (`ANY` \| `MALE` \| `FEMALE`), optional `prefMinAgeMonths` / `prefMaxAgeMonths`, optional `behavior` (`PLAYFUL` … `CHILL`), `prefBehavior` (`ANY` or same labels), optional `prefBreed` (exact case-insensitive match to other cat’s `breed`). Discovery applies **both** cats’ filters (reciprocal).

| Method | Path |
|--------|------|
| GET/POST | `/api/cats` |
| GET/PUT/DELETE | `/api/cats/{id}` |
| POST | `/api/cats/{id}/photos` (multipart `file`) |

## PawMatch / matches

| Method | Path |
|--------|------|
| GET | `/api/pawmatch/candidates?myCatId=` |
| POST | `/api/pawmatch/swipes` |
| GET | `/api/matches` |

## Chat

| Method | Path |
|--------|------|
| GET | `/api/chat/threads` (summaries include last preview, avatars) |
| POST | `/api/chat/dm/{userId}` — open or create a **DIRECT** 1:1 thread |
| GET | `/api/chat/threads/{id}/messages?page=&size=` |
| POST | `/api/chat/threads/{id}/messages` — `application/json` `{ "body" }` (text only) |
| POST | `/api/chat/threads/{id}/messages` — `multipart/form-data`: optional `body`, optional `file` (image; at least one required) |
| STOMP | `/app/chat.send` (JSON text only) → broadcast to `/topic/threads.{id}` |

## Market (legacy)

| Method | Path |
|--------|------|
| GET | `/api/market/listings?city=&region=` |
| GET | `/api/market/listings/mine` |
| GET/PUT | `/api/market/listings`, `/api/market/listings/{id}` |
| POST | `/api/market/listings/{id}/photo` |
| POST | `/api/market/listings/{id}/thread` |

## Paw Market (v2 — cat-verified C2C marketplace)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/paw/listings?category=&isFree=` | Browse available listings |
| GET | `/api/paw/listings/mine` | Seller's own listings |
| GET | `/api/paw/listings/{id}` | Single listing |
| POST | `/api/paw/listings` | Create (AI Cat-Check runs here) |
| PUT | `/api/paw/listings/{id}` | Update |
| POST | `/api/paw/listings/{id}/photo` | Upload photo (multipart `file`) |
| POST | `/api/paw/listings/{id}/buy` | Place order → opens chat thread |
| POST | `/api/paw/reviews` | Submit buyer review |
| GET | `/api/paw/users/{userId}/reviews` | Get seller reviews |

## Adopt + admin

| Method | Path |
|--------|------|
| POST | `/api/adopt/shelters` |
| GET | `/api/adopt/shelters/mine` (204 if none) |
| GET | `/api/adopt/listings`, `/api/adopt/listings/{id}` |
| GET | `/api/adopt/listings/mine` |
| POST | `/api/adopt/listings`, `/api/adopt/listings/{id}/photo`, `/api/adopt/listings/{id}/inquire` |
| GET | `/api/admin/shelters/pending` |
| POST | `/api/admin/shelters/{id}/approve` \| `/reject` |

## Static

| Method | Path |
|--------|------|
| GET | `/api/files/{filename}` (served from `pawhub.upload-dir`) |
