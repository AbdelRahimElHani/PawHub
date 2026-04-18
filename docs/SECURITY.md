# Security notes

- **JWT secret** must be overridden for any shared or production environment (`pawhub.jwt.secret` in `application.yml` or env).
- **Admin bootstrap** user is inserted on startup if missing (`admin@pawhub.local` / `admin123`) — **change or disable** before public deployment.
- **CORS** allows `http://localhost:*` and `http://127.0.0.1:*` only (see `WebConfig`).
- **WebSocket:** unauthenticated handshakes are rejected; STOMP `Principal` is required for server-side sends (enforced in `ChatService` participant checks).
