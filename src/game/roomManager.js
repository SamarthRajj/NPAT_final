const rooms = new Map();

function debugPrintRooms(action, roomId) {
  try {
    const snapshot = Array.from(rooms.values()).map((r) => ({
      id: r.id,
      creator: r.creator,
      players: r.players.map((p) => ({ userId: p.userId, username: p.username })),
    }));
    console.log(`[Rooms Debug] action=${action} roomId=${roomId} rooms=${JSON.stringify(snapshot)}`);
  } catch (e) {
    console.log("[Rooms Debug] Failed to serialize rooms", e);
  }
}

function createRoom(roomId, user) {
  if (rooms.has(roomId)) {
    return { success: false, message: "Room already exists" };
  }

  const room = {
    id: roomId,
    creator: user.userId,
    players: [user], // store full user info { userId, username }
  };
  console.log("createRoom", room);
  rooms.set(roomId, room);
  debugPrintRooms("createRoom", roomId);
  return { success: true, room };
}

function joinRoom(roomId, user) {
  const room = rooms.get(roomId);
  if (!room) return { success: false, message: "Room not found" };

  if (room.players.find((p) => p.userId === user.userId)) {
    return { success: false, message: "Already in the room" };
  }
  if (room.players.length >= 4) {
    return { success: false, message: "Room is full" };
  }

  room.players.push(user);
  debugPrintRooms("joinRoom", roomId);
  return { success: true, room };
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function removePlayerFromRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players = room.players.filter((p) => p.userId !== userId);
  if (room.players.length === 0) {
    rooms.delete(roomId);
  }
}

module.exports = { createRoom, joinRoom, getRoom, removePlayerFromRoom };
