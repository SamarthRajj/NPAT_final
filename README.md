# NPAT — Real-Time Multiplayer Platform

**Name · Place · Animal · Thing** is a real-time multiplayer word game prototype built with Node.js, Express, and Socket.IO.

This repository is intended to show a full-stack realtime app with:
- authenticated socket connections
- room-based multiplayer event routing
- live lobby/game/results UI flows
- server-managed game lifecycle and scoring
- REST endpoints for health, room state, and results

## Why this project

This project is a strong interview example because it demonstrates:
- backend architecture for multiplayer games
- WebSocket authentication with JWT
- separation of concerns between REST APIs and Socket.IO event handlers
- client-side state sync for lobby, game, and results screens
- technical tradeoffs between in-memory state and persistence

## Live demo

Deploy to [Render](https://render.com) using the included `render.yaml`, then set your URL here:

`https://your-service.onrender.com`

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5000`

> Optionally set `JWT_SECRET` in environment for production security.

## How to play

1. Open the homepage.
2. Enter a username and click **Login**.
3. Create a room or join an existing one using the room code.
4. In the lobby, wait until at least 2 players are connected.
5. The room creator clicks **Start Game**.
6. Each round shows a random letter; all players submit words matching the prompt.
7. After everyone submits, the creator advances to the next round.
8. After 3 rounds, the game ends and the results page displays scores.

## What a first-time visitor should know

- This is not a single-player app: game state is shared across connected clients.
- Rooms are isolated using Socket.IO room channels (`io.to(roomId)`).
- Authentication is handled with JWT tokens in both REST and WebSocket flows.
- The server controls the game lifecycle and validates actions like start/submit.
- Results are computed on the server and presented in a final summary page.

## Core features

- `POST /login` issues a JWT for the browser client
- Socket.IO auth middleware validates the token on every connection
- Lobby events: `createRoom`, `joinRoom`, `subscribeRoom`, `startGame`
- Game events: `startRound`, `submitAnswer`, `nextRound`
- Result events: `gameFinished`, final scoreboard delivery
- REST endpoints for health, room snapshots, and finished-game results

## System architecture

```text
Browser UI
  ├─ public/index.html   # login
  ├─ public/lobby.html   # room waiting area
  ├─ public/game.html    # live round play
  └─ public/results.html # final score summary

Express server (server.js)
  ├─ REST routes in src/routes/apiRoutes.js
  ├─ Socket.IO auth + rooms in src/sockets/*.js
  ├─ Redis adapter support (optional, pub/sub for multi-instance)
  └─ room state + scoring in src/game/*.js
```

## Run locally in development

```bash
npm install
npm run dev
```

Then open `http://localhost:5000` and follow the game flow.

## API reference

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/login` | Get JWT for player | no |
| GET | `/api/health` | Server health check | no |
| GET | `/api/rooms/:roomId` | Retrieve room state | Bearer JWT |
| GET | `/api/results/:roomId` | Get finished-game results | Bearer JWT |

## Interview talking points

- Built with Node.js, Express 5, Socket.IO 4, and JWT auth.
- Demonstrates realtime room-based architecture and message routing.
- Includes a modular router layer (`src/routes/apiRoutes.js`) and socket handler layer (`src/sockets/`).
- Supports room persistence helpers and Redis adapter wiring for multi-instance scaling.
- Uses server-side scoring and final result aggregation to keep game logic authoritative.

## Deploy on Render

1. Push repo to GitHub.
2. Create a new Render Web Service and connect the repo.
3. Set `JWT_SECRET` in the service environment variables.
4. Use `npm install` for build and `npm start` for start.

> Note: active rooms are in-memory by default, so restarting the service will clear unfinished games.

## Project structure

```text
server.js                     # HTTP + Socket.IO startup
src/routes/apiRoutes.js       # REST API routes and auth handling
src/middleware/auth.js        # JWT generation and verification
src/sockets/                  # socket event handlers for lobby, game, and results
src/game/roomManager.js       # room lifecycle, join/create, scoring, persistence helpers
src/game/resultManager.js     # finished-game results formatting
src/utils/redis.js            # Redis client and adapter helpers
public/                       # client pages and browser socket logic
scripts/benchmark-payload.js  # payload comparison benchmark
```

## Tech stack

- Node.js
- Express 5
- Socket.IO 4
- JSON Web Tokens
- Redis support for pub/sub scaling

## License

ISC
