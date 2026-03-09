# APP-GYM — Fitness Tracker & AI Recommendation Platform

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
APP-GYM/
├── server/          # Express API + MongoDB (Mongoose)
│   ├── config/      # DB connection, env helpers
│   ├── models/      # Mongoose schemas
│   ├── routes/      # Express routers
│   ├── controllers/ # Route handlers
│   ├── middleware/   # Auth, validation, error handling
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

- Node.js ≥ 18
- MongoDB 7+ (local or Atlas) — or use Docker Compose
- npm ≥ 9

### 1. Clone & install

```bash
git clone <repo-url> APP-GYM && cd APP-GYM
cp .env.example .env          # edit with your values

# Backend
cd server && npm install && cd ..

# Frontend
cd client && npm install && cd ..
```

### 2. Start with Docker Compose (recommended)

```bash
docker-compose up -d           # starts MongoDB + optional Mongo Express
cd server && npm run dev       # backend on :5000
cd client && npm run dev       # frontend on :5173
```

### 3. Seed exercises catalog

```bash
cd server && npm run seed
```

### 4. Run tests

```bash
cd server && npm test
cd client && npm test
```

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token TTL (e.g. `7d`) |
| `PORT` | Backend port (default 5000) |
| `YOUTUBE_API_KEY` | (optional) YouTube Data API key |
| `OPENAI_API_KEY` | (optional) For advanced AI recommendations |

## API Base URL

Development: `http://localhost:5000/api`

## License

MIT
