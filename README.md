# PawHub

Full-stack capstone app: **Spring Boot 3 + MySQL + JWT**, **React (Vite)**, **WebSocket/STOMP** chat, **Flyway** migrations.

## Prerequisites

- JDK 17+, Maven, Node 18+, Docker (for MySQL)

## Run MySQL

```bash
docker compose up -d
```

Default credentials match `backend/src/main/resources/application.yml` (`root` / `root`, database `pawhub`).

## Run backend

```bash
cd backend
mvn spring-boot:run
```

- API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger`
- Uploads are stored under `./uploads` (from the JVM working directory).

## Seed admin

On first startup an admin user is created:

- **Email:** `admin@pawhub.local`
- **Password:** `admin123`

Use **Admin → Pending shelters** in the UI (after logging in as admin) to approve shelter applications.

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` and `/ws` to the backend.

## Docs

See [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) and linked files for architecture, API index, and decisions.
