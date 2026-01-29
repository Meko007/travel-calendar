<!-- Root README for the Travel Calendar repo -->

# Travel Calendar

Travel Calendar is a two-part app for planning and approving employee travel. Users request trips, admins review and approve/reject them, and notifications keep everyone in sync.

## Repo layout
- `client/`: Vue 3 + Vite frontend
- `server/`: NestJS + Prisma API

## Quick start
1) Install dependencies
```bash
cd server
npm install
cp .env.sample .env

cd ../client
npm install
cp .env.sample .env
```

2) Configure environment variables
- `server/.env`: set `DATABASE_URL`, `JWT_*`, and `CORS_ORIGINS`
- `client/.env`: set `VITE_API_URL` to `http://localhost:3001/api`

3) Run the database migrations
```bash
cd server
npx prisma generate
npx prisma migrate dev
```

4) Run both apps
```bash
cd server
npm run start:dev
```

```bash
cd client
npm run dev
```

The client runs at `http://localhost:5173` and the API at `http://localhost:3001/api`.

## Documentation
- Client setup and routes: `client/README.md`
- Server setup and API endpoints: `server/README.md`

## Common scripts
```bash
# server
cd server
npm run start:dev

# client
cd client
npm run dev
```
