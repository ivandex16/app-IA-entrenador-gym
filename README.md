# StephFit — Fitness Tracker & AI Recommendation Platform

Full-stack gym tracking application built with **React**, **Node.js/Express**, and **MongoDB**.

## Features

- 🔐 User authentication (JWT) with role-based access (user / admin)
- 🏋️ Create, edit and manage custom workout routines
- 📝 Log workouts: sets, reps, weight, notes per exercise
- 📈 Track progress with charts and weekly reports
- 📚 Exercise catalog with filters, images and YouTube videos
- 🎯 Personal fitness goals (muscle gain, fat loss, endurance, etc.)
- 🤖 AI-powered exercise & routine recommendations (3-tier engine)
- 📱 Fully responsive (mobile-first, Tailwind CSS)

## Project Structure

```
StephFit/
├── server/          # Express API + MongoDB (Mongoose)
│   ├── config/      # DB connection, env helpers
│   ├── models/      # Mongoose schemas
│   ├── routes/      # Express routers
│   ├── controllers/ # Route handlers
│   ├── middleware/  # Auth, validation, error handling
│   ├── services/    # AI recommendation, weekly report
│   └── seeds/       # Sample exercise data
├── client/          # React (Vite) + Tailwind CSS
│   └── src/
│       ├── api/         # Axios instances & service calls
│       ├── components/  # Reusable UI components
│       ├── pages/       # Route-level page components
│       ├── context/     # Auth & app-level React context
│       ├── hooks/       # Custom React hooks
│       └── utils/       # Helpers & constants
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick Start

### Prerequisites

- Docker + Docker Compose

### 1. Clone & configure

```bash
git clone <repo-url> StephFit && cd StephFit
cp .env.example .env          # fill in JWT_SECRET at minimum
```

### 2. Start all services

```bash
docker compose up --build
```

| Service   | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:5173      |
| API       | http://localhost:5050/api  |
| Mongo UI  | http://localhost:8081      |

All services support hot reload — changes to `server/` restart the API via Bun's built-in watcher; changes to `client/src/` trigger Vite HMR in the browser.

### 3. Seed the exercise catalog (first run only)

```bash
docker compose exec server bun run seed
```

### 4. Run tests

```bash
docker compose exec server bun test
docker compose exec client bun test
```

---

### Alternative: Run without Docker

Prerequisites: [Bun](https://bun.sh/docs/installation), MongoDB 7+ (local or Atlas)

```bash
# Start MongoDB only
docker compose up -d mongo

# Backend (new terminal)
cd server && bun install && bun run dev

# Frontend (new terminal)
cd client && bun install && bun run dev
```

> After the first `bun install`, commit the generated `bun.lockb` files for reproducible installs.

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable          | Purpose                               |
|-------------------|---------------------------------------|
| `MONGODB_URI`     | MongoDB connection string             |
| `JWT_SECRET`      | Secret for signing JWTs               |
| `JWT_EXPIRES_IN`  | Token TTL (e.g. `7d`)                 |
| `PORT`            | Backend port (default 5000)           |
| `YOUTUBE_API_KEY` | (optional) YouTube Data API key       |
| `OPENAI_API_KEY`  | (optional) For advanced AI recommendations |

## API Base URL

| Mode | URL |
|------|-----|
| Docker | `http://localhost:5050/api` |
| Local (no Docker) | `http://localhost:5000/api` |

## License

MIT
