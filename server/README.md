# Travel Calendar API

The backend for the Travel Calendar app. This NestJS API provides authentication, trip management, admin approvals, and notification delivery. It uses PostgreSQL via Prisma and exposes Swagger documentation.

## Features
- JWT-based auth with access tokens + refresh tokens (stored as httpOnly cookies)
- Role-aware endpoints for admins and standard users
- Trip lifecycle management (PENDING, APPROVED, REJECTED)
- Notifications for trip approvals/rejections
- Swagger docs at `/api/docs`

## Tech stack
- NestJS
- Prisma ORM + PostgreSQL
- JWT + Passport
- Swagger (OpenAPI)
- Jest for tests

## Project structure
- `server/src/auth`: signup, login, refresh, and password changes
- `server/src/trips`: user trip creation, listing, and resubmission
- `server/src/admin`: admin approvals and user management
- `server/src/notifications`: notification listing and read status
- `server/prisma`: database schema and migrations

## Environment variables
Create `server/.env` from `server/.env.sample`:

```
PORT=3001
DATABASE_URL="postgresql://<username>:<password>@<host>:5432/travel_calendar?schema=public"
JWT_SECRET="<your_jwt_secret>"
JWT_EXPIRES_IN=3600
JWT_REFRESH_SECRET="<your_jwt_refresh_secret>"
JWT_REFRESH_EXPIRES_IN=604800
CORS_ORIGINS="http://localhost:5173,https://your-app.vercel.app"
NODE_ENV="dev"
```

Notes:
- `CORS_ORIGINS` is a comma-separated list. The API allows credentials, so the frontend origin must be listed.
- In non-prod environments, `http://localhost:5173` is added automatically.
- Refresh token cookies are set on `/api/auth/refresh` with secure settings in `NODE_ENV=prod`.

## Setup
```bash
cd server
npm install
cp .env.sample .env
```

## Database
This project uses Prisma with PostgreSQL.

Common commands:
```bash
npx prisma generate
npx prisma migrate dev
```
Ensure `DATABASE_URL` is set before running Prisma commands.

## Run locally
```bash
npm run start:dev
```

The API starts at `http://localhost:3001/api`.

## Swagger docs
```text
http://localhost:3001/api/docs
```

## Scripts
```bash
npm run build
npm run start
npm run start:dev
npm run start:prod
npm run lint
npm run test
npm run test:e2e
npm run test:cov
```

## Authentication overview
- `POST /api/auth/signup`: create user
- `POST /api/auth/login`: login user, returns access token + sets refresh cookie
- `POST /api/auth/admin/login`: login admin
- `POST /api/auth/refresh`: rotate tokens using refresh cookie
- `POST /api/auth/change-password`: update password (auth required)
- `GET /api/auth/me`: current user profile (auth required)

Access tokens are sent in the `Authorization: Bearer <token>` header. Refresh tokens are stored in an httpOnly cookie and sent automatically by the browser when `withCredentials` is enabled.

## Trip and notification endpoints
- `POST /api/trips`: create trip (auth required)
- `GET /api/trips`: list trips with pagination and optional status filter (auth required)
- `GET /api/trips/:id`: trip details (auth required)
- `GET /api/trips/date/:date`: trips for a date (auth required)
- `PATCH /api/trips/:id`: update trip (auth required)
- `PATCH /api/trips/:id/resubmit`: resubmit rejected trip (auth required)
- `DELETE /api/trips/:id`: delete trip (auth required)
- `GET /api/notifications`: list notifications (auth required)
- `PATCH /api/notifications/:id/read`: mark notification read (auth required)

## Admin endpoints
- `GET /api/admin/trips`: list trips (status + pagination)
- `PATCH /api/admin/trips/:id/approve`: approve pending trip
- `PATCH /api/admin/trips/:id/reject`: reject pending trip (requires reason)
- `GET /api/admin/users`: list users with search + pagination
- `PATCH /api/admin/users/:id/temporary-password`: set a temporary password

## Deployment
```bash
npm run build
npm run start:prod
```
