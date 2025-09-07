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

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    console.log(`[Lobby] disconnect fired userId=${socket.user.userId} reason=${reason}`);
    // Remove player from all rooms they were in
    io.sockets.adapter.rooms.forEach((_, roomId) => {
      console.log(`[Lobby] disconnect userId=${socket.user.userId} removing from roomId=${roomId}`);
      removePlayerFromRoom(roomId, socket.user.userId);
      const room = getRoom(roomId);
      if (room) {
        console.log(`[Lobby] Emitting roomUpdated (disconnect) to roomId=${roomId} players=${room.players.length}`);
        io.to(roomId).emit("roomUpdated", room);
      }
    });
  });
}

module.exports = lobbyEvents;
