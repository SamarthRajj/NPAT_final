const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { verifyToken } = require("./src/middleware/auth");
const bodyParser = require("body-parser");
const { generateToken } = require("./src/middleware/auth");
const socketHandler = require("./src/sockets");
const { getComprehensiveResults } = require("./src/game/resultManager");
const { getRoom, serializeGameState } = require("./src/game/roomManager");

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

function authFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.substring(7));
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

app.post("/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  const userId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const token = generateToken({ userId, username });
  res.json({ token, userId, username });
});

app.get("/api/results/:roomId", (req, res) => {
  const user = authFromHeader(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid or missing token" });
  }

  try {
    const results = getComprehensiveResults(req.params.roomId);
    if (results.success) {
      res.json(results);
    } else {
      res.status(results.message?.includes("not found") ? 404 : 400).json(results);
    }
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/api/rooms/:roomId", (req, res) => {
  const user = authFromHeader(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid or missing token" });
  }

  const room = getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found" });
  }

  res.json({
    success: true,
    room: {
      id: room.id,
      status: room.status,
      playerCount: room.players.length,
      players: room.players.map((p) => ({ userId: p.userId, username: p.username })),
      gameState: room.gameState
        ? serializeGameState(room.gameState)
        : null,
    },
  });
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  const user = verifyToken(token);
  if (!user) {
    return next(new Error("Authentication error: Invalid token"));
  }

  socket.user = user;
  next();
});

socketHandler(io);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5000;

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or set PORT to a different value.`
    );
    console.error(`Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
