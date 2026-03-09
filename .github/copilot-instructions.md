## APP-GYM — AI Agent Instructions

### Architecture overview
Full-stack **gym tracker** app: React (Vite) frontend + Node.js/Express REST API + MongoDB (Mongoose).
- `server/` — Express API (CommonJS). Entry: `server/server.js`. Runs on `:5000`.
- `client/` — React 18 SPA (Vite, ESM). Entry: `client/src/main.jsx`. Runs on `:5173`, proxies `/api` to backend.
- `docker-compose.yml` — MongoDB 7 + Mongo Express for local dev.
- `.env.example` at repo root — **copy to `.env`** before running anything.

### Quick start commands
```bash
cp .env.example .env                # configure secrets
docker-compose up -d                # MongoDB on :27017
cd server && npm install && npm run seed && npm run dev   # API :5000
cd client && npm install && npm run dev                   # UI  :5173
```

### Key conventions
- **Backend pattern:** `routes/<resource>.js` → `controllers/<resource>Controller.js` → Mongoose model in `models/<Resource>.js`. Follow this when adding new resources.
- **Auth:** JWT via `middleware/auth.js` (`protect`, `authorize`). Token stored in `localStorage`; attached by `client/src/api/axios.js` interceptor.
- **Validation:** `express-validator` chains in route files → `middleware/validate.js` middleware.
- **Error handling:** All controllers use `try/catch` + `next(err)`. Central handler in `middleware/errorHandler.js`.
- **Frontend state:** React Context (`context/AuthContext.jsx`) for auth; local `useState` per page. No Redux.
- **Styling:** Tailwind CSS with custom colours in `tailwind.config.js` (`primary`, `accent`, `dark`).
- **Protected routes:** Wrap page component in `<ProtectedRoute>` inside `App.jsx`.

### AI Recommendation Engine (`server/services/recommendationEngine.js`)
Three tiers — query via `GET /api/recommendations?tier=rules|scoring|llm`:
1. **rules** — maps goal type → exercise category/difficulty filters.
2. **scoring** — analyses 4-week workout history for muscle-group gaps, scores exercises by goal + level + equipment match.
3. **llm** — calls OpenAI `gpt-4o-mini` (requires `OPENAI_API_KEY`); gracefully falls back to scoring if key is missing.

### Weekly report (`server/services/weeklyReport.js`)
`GET /api/progress/weekly` — aggregates volume, sets, reps, max weight, compares current vs previous week, returns insights array. Frontend visualises with Recharts in `client/src/pages/Progress.jsx`.

### Models (MongoDB collections)
`User`, `Exercise`, `Routine`, `WorkoutLog`, `Goal`, `AIRecommendation` — all in `server/models/`. See fields and indexes in each file.

### Tests
```bash
cd server && npm test    # Jest + Supertest
cd client && npm test    # Vitest
```

### Environment variables (see `.env.example`)
`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `YOUTUBE_API_KEY` (optional), `OPENAI_API_KEY` (optional), `VITE_API_URL`.

### Seed data
`cd server && npm run seed` — populates 17 exercises across all muscle groups with YouTube video IDs.

### When adding a new feature
1. Create Mongoose model in `server/models/`.
2. Add controller in `server/controllers/` (follow `try/catch + next(err)` pattern).
3. Add route in `server/routes/` and register in `server/server.js`.
4. Add React page in `client/src/pages/`, add route in `client/src/App.jsx`.
5. Use `api` instance from `client/src/api/axios.js` for HTTP calls.
