# SmartClinic AI

A complete clinic management system with AI-assisted appointment booking, split into a **frontend** (Next.js) and a **dedicated backend** (Node.js + Express).

## Architecture

```
smartclinic-ai/
├── frontend/                 # Next.js (App Router) user interface
│   ├── app/                  # Pages & routes (dashboard, appointments, ...)
│   ├── components/           # Shared React components (AppLayout/sidebar, ...)
│   ├── lib/                  # Frontend Supabase client (NEXT_PUBLIC keys only)
│   ├── public/               # Static assets
│   ├── styles/               # Global CSS (Tailwind)
│   ├── .env.local            # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_BACKEND_URL
│   └── next.config.mjs       # Rewrites /api/* -> backend server
│
├── backend/                  # Node.js + Express API server
│   ├── routes/               # Express route definitions
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic (Supabase, AI, peak hours, email)
│   ├── middleware/           # Auth, central error handling
│   ├── config/               # Environment configuration
│   ├── .env                  # Server-only secrets (service role key, Groq/Resend/Gmail keys)
│   └── server.js             # Express entry point
│
└── README.md
```

## Data flow

```
Browser (React)  ->  Next.js (/api/* rewritten)  ->  Express backend  ->  Supabase / Groq(OpenAI-compatible) / Resend
```

The frontend **never** sees secret keys. `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `RESEND_API_KEY`, and `GMAIL_APP_PASSWORD` live only in `backend/.env`.

All backend endpoints reply with JSON and use a consistent error shape:

```json
{ "success": false, "error": "Something went wrong" }
```

## API endpoints (backend)

| Method | Route                       | Auth required | Description                              |
| ------ | --------------------------- | ------------- | ---------------------------------------- |
| GET    | `/`                         | No            | Backend health check                     |
| GET    | `/api/ai`                   | No            | AI endpoint status check                 |
| POST   | `/api/ai`                   | Yes (Supabase session token) | SmartClinic AI chat             |
| GET    | `/api/peak-hours`           | Yes           | TensorFlow.js peak clinic hour prediction |
| POST   | `/api/send-confirmation`    | Yes           | Appointment confirmation email            |

## Environment variables

### `frontend/.env.local` (safe to be public)

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### `backend/.env` (server-only, never expose these)

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
GROQ_API_KEY=<groq key>            # used by SmartClinic AI
RESEND_API_KEY=<resend key>        # email (primary provider)
RESEND_FROM_EMAIL=SmartClinic AI <onboarding@resend.dev>   # optional
GMAIL_EMAIL=<sender gmail>         # email fallback (SMTP app password)
GMAIL_APP_PASSWORD=<app password>
PORT=4000
FRONTEND_URL=http://localhost:3000
```

> [!WARNING]
> Never put `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `RESEND_API_KEY` or `GMAIL_APP_PASSWORD` in `frontend/.env.local` — anything with the `NEXT_PUBLIC_` prefix (or inside the frontend) ends up in the browser bundle.

## Getting started

```bash
# 1. Install dependencies (needs to be done once)
npm install --prefix frontend
npm install --prefix backend

# 2. Start everything — this runs BOTH servers together (Ctrl+C stops both)
npm run dev
```

The single `npm run dev` starts the backend (http://localhost:4000) and the frontend
(http://localhost:3000) side by side via `concurrently`. If you prefer separate
terminals, run `npm run dev:backend` and `npm run dev:frontend` in two terminals
instead — just remember both servers must be running.

Production:

```bash
npm run build:frontend
npm run start:backend
npm run start:frontend
```

## Testing the restructure

- **Login / registration / Google OAuth / password reset** - frontend Supabase auth (unchanged).
- **Appointments, rescheduling, availability, doctor schedules, fees, waiting times** - existing UI, data still in Supabase.
- **AI assistant** - chat now calls the backend `/api/ai`; usage is logged to `ai_usage_logs` server-side (uses the session token, not client-supplied IDs).
- **Peak clinic hour prediction** - dashboard calls `/api/peak-hours` on the backend (TensorFlow.js).
- **Email confirmations** - uses Resend first, falls back to Gmail SMTP (nodemailer). Resend's test mode only delivers to the account owner's verified addresses; to send to any recipient, set `RESEND_FROM_EMAIL` to a verified sending domain. The Gmail fallback keeps appointment emails working out of the box.

> [!NOTE]
> The frontend proxies `/api/*` to the backend through Next.js rewrites, so both servers must be running during development.

## Optional: backend smoke test

`backend/scripts/auth-smoke-test.mjs` creates a temporary Supabase user, exercises `/api/ai`, `/api/peak-hours` and `/api/send-confirmation` with a real session token, then deletes the test user and its usage logs:

```bash
npm run dev:backend   # backend must be running first
node backend/scripts/auth-smoke-test.mjs
```