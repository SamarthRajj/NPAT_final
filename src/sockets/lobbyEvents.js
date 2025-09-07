const { createRoom, joinRoom, getRoom, removePlayerFromRoom } = require("../game/roomManager");

function lobbyEvents(io, socket) {
  // Create room
  socket.on("createRoom", ({ roomId }, callback) => {
    console.log(`[Lobby] createRoom requested by userId=${socket.user.userId} roomId=${roomId}`);
    const result = createRoom(roomId, socket.user);
    if (result.success) {
      socket.join(roomId);
      console.log(`[Lobby] createRoom success; joined socket to roomId=${roomId}`);
      callback({ success: true, room: result.room });
      console.log(`[Lobby] Emitting roomUpdated to roomId=${roomId} players=${result.room.players.length}`);
      io.to(roomId).emit("roomUpdated", result.room);
    } else {
      console.warn(`[Lobby] createRoom failed roomId=${roomId} reason=${result.message}`);
      callback({ success: false, message: result.message });
    }
  });

  // Join room
  socket.on("joinRoom", ({ roomId }, callback) => {
    console.log(`[Lobby] joinRoom requested by userId=${socket.user.userId} roomId=${roomId}`);
    const result = joinRoom(roomId, socket.user);
    if (result.success) {
      socket.join(roomId);
      console.log(`[Lobby] joinRoom success; joined socket to roomId=${roomId}`);
      callback({ success: true, room: result.room });
      console.log(`[Lobby] Emitting roomUpdated to roomId=${roomId} players=${result.room.players.length}`);
      io.to(roomId).emit("roomUpdated", result.room);
    } else {
      console.warn(`[Lobby] joinRoom failed roomId=${roomId} reason=${result.message}`);
      callback({ success: false, message: result.message });
    }
  });

  // Subscribe (re-join) room after navigation
  socket.on("subscribeRoom", ({ roomId }, callback) => {
    console.log(`[Lobby] subscribeRoom requested by userId=${socket.user.userId} roomId=${roomId}`);
    const room = getRoom(roomId);
    if (!room) {
      console.warn(`[Lobby] subscribeRoom failed; room not found roomId=${roomId}`);
      if (callback) callback({ success: false, message: "Room not found" });
      return;
    }
    // Ensure user is part of logical room roster; if missing, add
    if (!room.players.find((p) => p.userId === socket.user.userId)) {
      console.log(`[Lobby] subscribeRoom: user not listed; adding userId=${socket.user.userId} to roomId=${roomId}`);
      const addResult = joinRoom(roomId, socket.user);
      if (!addResult.success) {
        console.warn(`[Lobby] subscribeRoom: failed to add user to roomId=${roomId} reason=${addResult.message}`);
      }
    }
    socket.join(roomId);
    console.log(`[Lobby] subscribeRoom success; joined socket to roomId=${roomId}`);
    if (callback) callback({ success: true, room });
    console.log(`[Lobby] Emitting roomUpdated (subscribe) to roomId=${roomId} players=${room.players.length}`);
    io.to(roomId).emit("roomUpdated", room);
  });

  // Start game (admin only)
  socket.on("startGame", ({ roomId }, callback) => {
    console.log(`[Lobby] startGame requested by userId=${socket.user.userId} roomId=${roomId}`);
    const room = getRoom(roomId);
    if (!room) {
      console.warn(`[Lobby] startGame failed; room not found roomId=${roomId}`);
      if (callback) callback({ success: false, message: "Room not found" });
      return;
    }
    
    // Check if user is the admin/creator
    if (room.creator !== socket.user.userId) {
      console.warn(`[Lobby] startGame failed; user is not admin userId=${socket.user.userId} creator=${room.creator}`);
      if (callback) callback({ success: false, message: "Only admin can start the game" });
      return;
    }
    
    // Check if room has at least 2 players
    if (room.players.length < 2) {
      console.warn(`[Lobby] startGame failed; not enough players roomId=${roomId} players=${room.players.length}`);
      if (callback) callback({ success: false, message: "Need at least 2 players to start" });
      return;
    }
    
    // Set room status to in-progress
    room.status = "in-progress";
    console.log(`[Lobby] startGame success; room status set to in-progress roomId=${roomId}`);
    
    if (callback) callback({ success: true, room });
    
    // Emit gameStart to all players in the room
    console.log(`[Lobby] Emitting gameStart to roomId=${roomId} players=${room.players.length}`);
    io.to(roomId).emit("gameStart", { roomId, room });
  });

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    console.log(`[Lobby] disconnect fired userId=${socket.user.userId} reason=${reason}`);
    
    // Only remove player from rooms if it's a real disconnect (not page navigation)
    // Page navigation typically has reason "client namespace disconnect" or "transport close"
    // We'll use a timeout to distinguish between navigation and real disconnection
    const userId = socket.user.userId;
    
    setTimeout(() => {
      // Check if user has reconnected (new socket with same userId)
      const userReconnected = Array.from(io.sockets.sockets.values())
        .some(s => s.user && s.user.userId === userId);
      
      if (!userReconnected) {
        console.log(`[Lobby] User ${userId} did not reconnect, removing from all rooms`);
        // Remove player from all rooms they were in
        io.sockets.adapter.rooms.forEach((_, roomId) => {
          console.log(`[Lobby] disconnect userId=${userId} removing from roomId=${roomId}`);
          removePlayerFromRoom(roomId, userId);
          const room = getRoom(roomId);
          if (room) {
            console.log(`[Lobby] Emitting roomUpdated (disconnect) to roomId=${roomId} players=${room.players.length}`);
            io.to(roomId).emit("roomUpdated", room);
          }
        });
      } else {
        console.log(`[Lobby] User ${userId} reconnected, keeping in rooms`);
      }
    }, 2000); // 2 second delay to allow for reconnection
  });
}

module.exports = lobbyEvents;
