# StephFit â€” Fitness Tracker & AI Recommendation Platform

Full-stack gym tracking application built with **React**, **Node.js/Express**, and **MongoDB**.

## Features

- ðŸ” User authentication (JWT) with role-based access (user / admin)
- ðŸ‹ï¸ Create, edit and manage custom workout routines
- ðŸ“ Log workouts: sets, reps, weight, notes per exercise
- ðŸ“ˆ Track progress with charts and weekly reports
- ðŸ“š Exercise catalog with filters, images and YouTube videos
- ðŸŽ¯ Personal fitness goals (muscle gain, fat loss, endurance, etc.)
- ðŸ¤– AI-powered exercise & routine recommendations (3-tier engine)
- ðŸ“± Fully responsive (mobile-first, Tailwind CSS)

## Project Structure

```
StephFit/
â”œâ”€â”€ server/          # Express API + MongoDB (Mongoose)
â”‚   â”œâ”€â”€ config/      # DB connection, env helpers
â”‚   â”œâ”€â”€ models/      # Mongoose schemas
â”‚   â”œâ”€â”€ routes/      # Express routers
â”‚   â”œâ”€â”€ controllers/ # Route handlers
â”‚   â”œâ”€â”€ middleware/   # Auth, validation, error handling
â”‚   â”œâ”€â”€ services/    # AI recommendation, weekly report
â”‚   â””â”€â”€ seeds/       # Sample exercise data
â”œâ”€â”€ client/          # React (Vite) + Tailwind CSS
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ api/         # Axios instances & service calls
â”‚       â”œâ”€â”€ components/  # Reusable UI components
â”‚       â”œâ”€â”€ pages/       # Route-level page components
â”‚       â”œâ”€â”€ context/     # Auth & app-level React context
â”‚       â”œâ”€â”€ hooks/       # Custom React hooks
â”‚       â””â”€â”€ utils/       # Helpers & constants
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ .env.example
â””â”€â”€ README.md
```

## Quick Start

### Prerequisites

- Node.js â‰¥ 18
- MongoDB 7+ (local or Atlas) â€” or use Docker Compose
- npm â‰¥ 9

### 1. Clone & install

```bash
git clone <repo-url> StephFit && cd StephFit
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

