# Decisions

- **Desktop web first** — single React SPA; no React Native in this repo.
- **MySQL via Docker** for local; Flyway owns schema (`V1__init.sql`).
- **JWT** subject = user id; bearer on REST; **WS** token via query `access_token` and STOMP `connectHeaders.access_token` fallback.
- **Shelters** require **admin approval** before adoption listings or “mine” shelter listings endpoints succeed.
- **Chat transport:** STOMP simple broker for `/topic/...`; messages persisted in `messages` and pushed to topic `threads.{threadId}`.
- **Listing images:** JSON create/update plus separate multipart **photo** upload endpoints (simpler than mixed multipart JSON).
- **Demo uploads:** local filesystem directory `pawhub.upload-dir` (default `./uploads`).
