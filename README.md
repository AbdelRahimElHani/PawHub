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

### Email verification (Gmail)

`application-local.yml` (gitignored) turns on SMTP and **requires** clicking the verification link before login.

1. Copy `application-local.yml.example` if you don’t have `application-local.yml` yet (the repo may already generate one locally).
2. Set your **Gmail app password** in the environment, then start:

```powershell
cd backend
$env:MAIL_PASSWORD = "YOUR_16_CHAR_APP_PASSWORD"
.\run-with-mail.ps1
```

Or set `MAIL_PASSWORD` (and optionally `MAIL_USERNAME`) in your IDE run configuration.

- API: `http://localhost:8081`
- Swagger UI: `http://localhost:8081/swagger`
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
