# NPAT — Real-Time Multiplayer Platform

**Name · Place · Animal · Thing** — a real-time multiplayer word game built with Node.js, Express, and Socket.IO.

## Live demo

Deploy to [Render](https://render.com) using the included `render.yaml`, then set your URL here:

`https://your-service.onrender.com`

## Features

- Event-driven Socket.IO backend with JWT auth (HTTP + WebSocket)
- Room-level isolation (`io.to(roomId)`) for up to 4 players per session
- 3-round game lifecycle with server-side scoring and finish guards
- Delta-style `gameStateUpdate` broadcasts with monotonic `eventId` deduplication
- REST APIs: `/login`, `/api/health`, `/api/rooms/:roomId`, `/api/results/:roomId`
- Minimal black-and-white UI with accent highlights

## Architecture

```
Browser (index → lobby → game → results)
    │  REST: login, results, room snapshot
    └── WebSocket: create/join, rounds, submissions, gameFinished
              │
         Express + Socket.IO
              │
         roomManager (in-memory Map)
         resultManager (leaderboard, stats)
```

## Run locally

```bash
npm install
cp .env.example .env   # optional: set JWT_SECRET
npm run dev            # or npm start
```

Open `http://localhost:5000`

## Game flow

1. Login with a username → create or join a room
2. Lobby: admin starts when ≥2 players
3. Admin starts each round → players submit answers for the letter
4. Admin clicks **Next round** after all submit (3 rounds total)
5. **Game Finished** → **View Results** for full breakdown

## Benchmarks

### Payload size (run locally)

```bash
node scripts/benchmark-payload.js
```

Example output (`node scripts/benchmark-payload.js`):

```
Full gameState: 532 bytes
Delta update:    155 bytes
Reduction:       ~71% smaller per high-frequency emit
```

### Latency (measure in browser)

1. Open 2–4 tabs, join the same room, complete one round.
2. In DevTools → Network → WS, or add `performance.now()` around `submitAnswer` ack in `game.js`.
3. Record p50 / p95 round-trip time for `submitAnswer` callbacks.
4. Repeat on Render after deploy and document honestly in your resume.

**Template for resume** (replace with your measurements):

> Optimized network payload via game-state delta updates (~[X]% smaller than full-state broadcasts). Measured p50 [N]ms / p95 [M]ms submit-answer latency with [P] concurrent players on [localhost | Render free tier].

## API

| Method | Path | Auth |
|--------|------|------|
| POST | `/login` | — |
| GET | `/api/health` | — |
| GET | `/api/rooms/:roomId` | Bearer JWT |
| GET | `/api/results/:roomId` | Bearer JWT (game must be finished) |

## Deploy on Render

1. Push repo to GitHub
2. New **Web Service** → connect repo (or use Blueprint / `render.yaml`)
3. Set `JWT_SECRET` in environment
4. Build: `npm install` · Start: `npm start`

**Note:** Rooms are in-memory. A single instance is required; restarts clear active games.

## Project structure

```
server.js                 # HTTP + Socket.IO entry
src/game/roomManager.js   # Rooms, rounds, scoring
src/game/resultManager.js # Results formatting
src/sockets/              # lobby, game, result handlers
public/                   # Static UI
```

## Tech stack

- Node.js, Express 5
- Socket.IO 4
- JSON Web Tokens

## License

ISC
