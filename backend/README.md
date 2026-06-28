Attenda backend (Node.js + Express)

Setup
1. Copy .env.example to .env and fill DATABASE_URL and JWT_SECRET
2. cd backend && npm install
3. npm run start (or npm run dev for auto-reload)

Endpoints
- POST /api/auth/register  { email, password } -> { token }
- POST /api/auth/login     { email, password } -> { token }
- GET  /api/ping           -> { ok: true }

Notes
- Creates a users table on startup if it doesn't exist.
- Use PostgreSQL for persistence.
