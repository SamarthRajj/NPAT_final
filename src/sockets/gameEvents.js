const {
  getRoom,
  startRound,
  submitAnswer,
  nextRound,
  getGameResults,
  serializeGameState,
} = require("../game/roomManager");

function roomPayload(room) {
  return {
    id: room.id,
    creator: room.creator,
    players: room.players,
    status: room.status,
  };
}

function buildDelta(gameState, keys) {
  const delta = {};
  keys.forEach((key) => {
    if (gameState[key] !== undefined) {
      delta[key] = gameState[key];
    }
  });
  return delta;
}

function emitGameDelta(io, roomId, room, deltaKeys) {
  const gs = room.gameState;
  if (!gs) return;
  io.to(roomId).emit("gameStateUpdate", {
    roomId,
    eventId: gs.lastEventId,
    version: gs.version,
    delta: buildDelta(serializeGameState(gs), deltaKeys),
    room: roomPayload(room),
  });
}

function gameEvents(io, socket) {
  socket.on("startRound", ({ roomId }, callback) => {
    const room = getRoom(roomId);
    if (!room) {
      if (callback) callback({ success: false, message: "Room not found" });
      return;
    }

    if (room.creator !== socket.user.userId) {
      if (callback) callback({ success: false, message: "Only admin can start rounds" });
      return;
    }

    const result = startRound(roomId);
    if (result.success) {
      if (callback) callback({ success: true, gameState: result.gameState, eventId: result.eventId });

      io.to(roomId).emit("roundStarted", {
        roomId,
        eventId: result.eventId,
        gameState: result.gameState,
        room: roomPayload(room),
      });

      emitGameDelta(io, roomId, room, [
        "round",
        "currentLetter",
        "submissions",
        "submittedPlayers",
        "status",
        "version",
      ]);
    } else if (callback) {
      callback({ success: false, message: result.message });
    }
  });

  socket.on("submitAnswer", ({ roomId, submission }, callback) => {
    const room = getRoom(roomId);
    if (!room) {
      if (callback) callback({ success: false, message: "Room not found" });
      return;
    }

    const result = submitAnswer(roomId, socket.user.userId, submission);
    if (result.success) {
      if (callback) callback({ success: true, gameState: result.gameState, eventId: result.eventId });

      io.to(roomId).emit("answerSubmitted", {
        roomId,
        eventId: result.eventId,
        userId: socket.user.userId,
        username: socket.user.username,
        gameState: result.gameState,
        room: roomPayload(room),
      });

      emitGameDelta(io, roomId, room, ["submissions", "submittedPlayers", "version"]);

      if (result.gameState.submittedPlayers.length === room.players.length) {
        io.to(roomId).emit("allPlayersSubmitted", {
          roomId,
          eventId: result.eventId,
          gameState: result.gameState,
          room: roomPayload(room),
        });
      }
    } else if (callback) {
      callback({ success: false, message: result.message });
    }
  });

  socket.on("nextRound", ({ roomId }, callback) => {
    const room = getRoom(roomId);
    if (!room) {
      if (callback) callback({ success: false, message: "Room not found" });
      return;
    }

    if (room.creator !== socket.user.userId) {
      if (callback) callback({ success: false, message: "Only admin can start next round" });
      return;
    }

    const result = nextRound(roomId);
    if (result.success) {
      if (result.gameFinished) {
        if (callback) {
          callback({
            success: true,
            gameFinished: true,
            completedRound: result.completedRound,
            gameState: result.gameState,
            eventId: result.eventId,
          });
        }

        io.to(roomId).emit("gameFinished", {
          roomId,
          eventId: result.eventId,
          completedRound: result.completedRound,
          gameState: result.gameState,
          room: roomPayload(room),
        });

        emitGameDelta(io, roomId, room, ["status", "finalScores", "roundResults", "version"]);

        io.to(roomId).emit("gameFinishedNotification", {
          roomId,
          eventId: result.eventId,
          timestamp: Date.now(),
          message: "Game has finished. View results for the full breakdown.",
        });
      } else {
        if (callback) {
          callback({
            success: true,
            gameFinished: false,
            completedRound: result.completedRound,
            gameState: result.gameState,
            eventId: result.eventId,
          });
        }

        io.to(roomId).emit("roundCompleted", {
          roomId,
          eventId: result.eventId,
          completedRound: result.completedRound,
          gameState: result.gameState,
          room: roomPayload(room),
        });

        emitGameDelta(io, roomId, room, ["round", "roundResults", "version"]);
      }
    } else if (callback) {
      callback({ success: false, message: result.message });
    }
  });

  socket.on("getGameState", ({ roomId }, callback) => {
    const room = getRoom(roomId);
    if (!room) {
      if (callback) callback({ success: false, message: "Room not found" });
      return;
    }

    if (!room.gameState) {
      if (callback) callback({ success: false, message: "No game state found" });
      return;
    }

    if (callback) {
      callback({
        success: true,
        gameState: serializeGameState(room.gameState),
        eventId: room.gameState.lastEventId,
        room: roomPayload(room),
      });
    }
  });

  socket.on("getGameResults", ({ roomId }, callback) => {
    const result = getGameResults(roomId);
    if (result.success) {
      const gs = result.gameState;
      if (callback) {
        callback({
          success: true,
          roundResults: result.roundResults,
          finalScores: result.finalScores,
          gameState: gs ? serializeGameState(gs) : null,
        });
      }
    } else if (callback) {
      callback({ success: false, message: result.message });
    }
  });
}

module.exports = gameEvents;
