# API surface (index)

OpenAPI: `http://localhost:8080/v3/api-docs` — Swagger UI: `/swagger`.

## Auth

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Bearer |

## Cats

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
| GET | `/api/chat/threads` |
| GET | `/api/chat/threads/{id}/messages?page=&size=` |
| POST | `/api/chat/threads/{id}/messages` (JSON body) |
| STOMP | `/app/chat.send` → `/topic/threads.{id}` |

## Market

| Method | Path |
|--------|------|
| GET | `/api/market/listings?city=&region=` |
| GET | `/api/market/listings/mine` |
| GET/PUT | `/api/market/listings`, `/api/market/listings/{id}` |
| POST | `/api/market/listings/{id}/photo` |
| POST | `/api/market/listings/{id}/thread` |

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
