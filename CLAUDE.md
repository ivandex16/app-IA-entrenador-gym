# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**StephFit** is a full-stack fitness tracker and AI coaching platform. It consists of a Node.js/Express REST API (`server/`) and a React SPA (`client/`).

## Development Commands

### Start local development

```bash
# Recommended: all services via Docker (hot reload included)
docker compose up --build

# Manual: start only the database, then run server & client locally
docker compose up -d mongo
cd server && bun run dev      # :5000 (local) / :5050 (Docker host port)
cd client && bun run dev      # :5173
```

### Testing

```bash
# Backend (bun test + supertest)
docker compose exec server bun test   # Docker
cd server && bun test                 # local

# Frontend (Vitest)
docker compose exec client bun test   # Docker
cd client && bun test                 # local
```

### Seeding

```bash
docker compose exec server bun run seed   # Docker — seeds 120+ exercises
cd server && bun run seed                 # local
```

### Other server scripts

```bash
bun run videos:migrate-shorts       # Migrate YouTube IDs to Shorts format
bun run exercises:backfill-content  # Backfill exercise content
bun run exercises:normalize-names   # Normalize exercise name casing
```

## Environment Variables

Copy `.env.example` to `.env` (project root). Key variables:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Must be changed in production |
| `JWT_EXPIRES_IN` | Token TTL (default: `7d`) |
| `CLIENT_URL` | Frontend origin for CORS |
| `GEMINI_API_KEY` | Google Gemini (AI recommendations) |
| `OPENAI_API_KEY` | OpenAI fallback (optional) |
| `VITE_API_URL` | Frontend API base (default: `http://localhost:5000/api`) |

SMTP variables (`SMTP_HOST`, `SMTP_USER`, etc.) are needed for email features. AI keys are optional — the recommendation engine falls back to rule-based scoring if no key is set.

## Architecture

### Backend: `server/`

**Pattern**: Route → Controller → Service → Model (MVC)

- `routes/` — Express routers (12 files, one per resource)
- `controllers/` — Request handlers; always use `try/catch + next(err)`
- `services/` — Business logic (AI engines, email, scheduling)
- `models/` — Mongoose schemas (10 collections)
- `middleware/` — `auth.js` (JWT `protect`/`authorize`), `validate.js` (express-validator), `errorHandler.js`

**Authentication**: JWT Bearer tokens. `protect` middleware verifies the token; `authorize(...roles)` restricts by role (`user`, `trainer`, `admin`).

**Error handling**: All controller errors pass through `next(err)` to the centralized `errorHandler.js`. Never send error responses directly from controllers.

**Rate limiting**: 1000 requests / 15 min per IP (configured in `server.js`).

### Frontend: `client/src/`

**State management**: React Context only (`AuthContext.jsx` for auth/user state). No Redux.

**API calls**: All requests go through `api/axios.js`, which attaches the JWT from `localStorage` and handles 401 redirects globally.

**Protected routes**: Wrap private pages with `<ProtectedRoute>` in `App.jsx`.

**Styling**: Tailwind CSS with custom design tokens in `tailwind.config.js`. Use project color names (`primary`, `accent`, `dark`) rather than raw Tailwind colors.

**Notifications**: Use `react-hot-toast` for user feedback.

### AI Recommendation Engine (`server/services/recommendationEngine.js`)

Three-tier system evaluated in order:
1. **Tier 1 — Rules**: Maps goal types to exercise categories
2. **Tier 2 — Scoring**: History-based scoring with gap analysis (muscles not trained recently score higher)
3. **Tier 3 — LLM**: Calls Gemini (primary) or OpenAI (fallback) for a full natural-language plan; only invoked if an API key is configured

### MongoDB Collections

`User`, `Exercise`, `Routine`, `WorkoutLog`, `Goal`, `AIRecommendation`, `WeightLog`, `CoachingAssignment`, `SavedFitRecipe`, `Notification`

### Deployment

- **Backend**: Render.com — configured via `render.yaml`. Health check endpoint: `GET /api/health`
- **Frontend**: Vercel — SPA rewrites configured in `client/vercel.json`
- **Database**: MongoDB Atlas in production

## Key Conventions

- **CommonJS** in `server/`; **ESM** in `client/`
- `express-validator` chains are defined in route files and applied before controllers
- The Vite dev server proxies `/api/*` to `process.env.BACKEND_URL` (Docker: `http://server:5000`) or `http://localhost:5000` (manual) — no CORS issues in local dev
- Role-based access: `protect` + `authorize('admin')` guards admin routes; coaching routes use `authorize('trainer', 'admin')`
- Mongoose models use pre-save hooks for password hashing; never hash passwords manually in controllers
