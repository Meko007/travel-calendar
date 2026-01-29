# Travel Calendar Client

The frontend for the Travel Calendar app. It delivers the trip booking calendar, user/admin dashboards, and authentication flows. It talks to the NestJS API via `VITE_API_URL` and uses refresh-token cookies for session continuity.

## Features
- Monthly travel calendar with approved-trip visibility and trip booking modal
- User authentication (signup, login, change password) with automatic token refresh
- Trip lifecycle UX: create, view, and resubmit rejected trips
- Notifications center for approvals/rejections with unread badge counts
- Admin dashboard for pending approvals and user directory management
- Responsive layouts with Tailwind + scoped component styles

## Tech stack
- Vue 3 + TypeScript + Vite
- Pinia for state management
- Vue Router for role-aware routing
- Axios for API access with refresh handling
- Tailwind CSS (via `@import "tailwindcss"`)

## Project structure
- `client/src/pages`: app routes (calendar, admin, notifications, auth)
- `client/src/components`: reusable UI like the monthly calendar
- `client/src/stores`: Pinia stores (auth/session)
- `client/src/lib`: API client, types, and API helpers

## Environment variables
Create `client/.env` from `client/.env.sample`:

```
VITE_API_URL="http://localhost:3001/api"
```

Notes:
- The API base URL must include the `/api` prefix (the server sets a global `api` prefix).
- The API must allow credentials so the refresh-token cookie can be used.
- The API needs to be running for the client to authenticate and load trips.

## Setup
```bash
cd client
npm install
cp .env.sample .env
```

## Run locally
```bash
npm run dev
```

By default Vite runs on `http://localhost:5173`.

## Build and preview
```bash
npm run build
npm run preview
```

The production build is written to `client/dist`.

## Routes
- `/login`, `/signup`: authentication
- `/calendar`: monthly travel calendar (users and admins)
- `/notifications`: user notifications (users only)
- `/trips/:id/resubmit`: resubmit rejected trips (users only)
- `/admin`: admin dashboard (admins only)
- `/admin/trips/:id`: review and approve/reject trips (admins only)
- `/admin/users`: user directory + temporary password reset (admins only)
- `/change-password`: forced password update flow

## Deployment notes
- `client/vercel.json` provides a Vercel-friendly configuration.
- Ensure `VITE_API_URL` points to the deployed API and allows CORS credentials.
