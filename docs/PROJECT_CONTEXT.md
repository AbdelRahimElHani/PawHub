# PawHub — project context

## Product

**PawHub** — Tier 1: cat profiles + JWT auth, **PawMatch** (swipes → mutual match + thread), **PawMarket** (listings + seller chat thread), **PawAdopt** (shelter application → **admin approval** → adoption listings + inquiry threads). **Real-time chat** via **STOMP** over SockJS (`/ws?access_token=…` and `connectHeaders.access_token`).

## Repo layout

| Path | Stack |
|------|--------|
| `backend/` | Spring Boot 3.2, JPA, Flyway, Security + JWT, WebSocket/STOMP, springdoc OpenAPI |
| `frontend/` | React 18 + TypeScript + Vite, react-router-dom, @stomp/stompjs + sockjs-client |
| `docs/` | High-signal markdown (this file, architecture, data model, API index, decisions, design tokens) |

## Local run

1. `docker compose up -d` (MySQL 8 on 3306).
2. `cd backend && mvn spring-boot:run`
3. `cd frontend && npm install && npm run dev` → http://localhost:5173

Admin seed: `admin@pawhub.local` / `admin123`.

**Email verification:** New accounts receive a verification link (SMTP via `spring.mail.*`, or the link is logged if mail is not configured). For production, set `pawhub.auth.auto-verify-email-on-registration: false` and configure SMTP. The repo default uses auto-verify on registration in `application.yml` for frictionless local dev.

## Conventions

- REST base path: `/api/...`
- Auth: `Authorization: Bearer <jwt>` (except register/login and static files).
- Listing photos: create listing JSON first, then `POST` multipart `file` to `.../photo` endpoints.
