const express = require("express");
const { generateToken, authenticateRequest } = require("../middleware/auth");
const { getRoom, serializeGameState } = require("../game/roomManager");
const { getComprehensiveResults } = require("../game/resultManager");

const router = express.Router();

router.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

router.post("/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  const userId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const token = generateToken({ userId, username });
  res.json({ token, userId, username });
});

router.get("/api/rooms/:roomId", authenticateRequest, (req, res) => {
  const room = getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found" });
  }

  const authorized = room.players.some((player) => player.userId === req.user.userId);
  if (!authorized) {
    return res.status(403).json({ success: false, message: "Not authorized for this room" });
  }

  res.json({
    success: true,
    room: {
      id: room.id,
      status: room.status,
      playerCount: room.players.length,
      players: room.players.map((p) => ({ userId: p.userId, username: p.username })),
      gameState: room.gameState ? serializeGameState(room.gameState) : null,
    },
  });
});

router.get("/api/results/:roomId", authenticateRequest, (req, res) => {
  const room = getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found" });
  }

  const authorized = room.players.some((player) => player.userId === req.user.userId);
  if (!authorized) {
    return res.status(403).json({ success: false, message: "Not authorized for this room" });
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

module.exports = router;
