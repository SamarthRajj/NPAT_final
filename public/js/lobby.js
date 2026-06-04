const token = localStorage.getItem("token");
const roomId = localStorage.getItem("roomId");

function logDebug(message, data) {
  const ts = new Date().toISOString();
  const line = `[LobbyJS ${ts}] ${message}` + (data !== undefined ? ` ${JSON.stringify(data)}` : "");
  console.log(line);
  const el = document.getElementById("debugLog");
  if (el) {
    el.textContent += (el.textContent ? "\n" : "") + line;
    el.scrollTop = el.scrollHeight;
  }
}

if (!token || !roomId) {
  // logDebug("Missing token or roomId; redirecting to login");
  alert("Missing token or roomId, please login again.");
  window.location.href = "/";
}

document.getElementById("roomId").textContent = roomId;

// Connect with JWT
const socket = io({
  auth: { token },
});

socket.on("connect", () => {
  // logDebug("Socket connected", { id: socket.id });
  // Ensure we are subscribed to the room after navigation
  // logDebug("Emitting subscribeRoom", { roomId });
  socket.emit("subscribeRoom", { roomId }, (res) => {
    // logDebug("subscribeRoom ack", res);
    if (!res || !res.success) {
      alert(res?.message || "Failed to subscribe to room");
    }
  });
});

// socket.on("connect_error", (err) => {
//   logDebug("connect_error", { message: err.message });
// });

// socket.on("disconnect", (reason) => {
//   logDebug("Socket disconnected", { reason });
// });

// Listen for room updates
socket.on("roomUpdated", (room) => {
  // logDebug("Received roomUpdated", { roomId: room?.id, players: room?.players?.length });
  const playersList = document.getElementById("players");
  playersList.innerHTML = "";

  const decoded = parseJwt(token);

  room.players.forEach((player) => {
    const li = document.createElement("li");
    li.className = "player-chip";
    if (player.userId === decoded.userId) li.classList.add("you");
    li.textContent = `${player.username}${player.userId === room.creator ? " · Admin" : ""}`;
    playersList.appendChild(li);
  });

  const startBtn = document.getElementById("startBtn");
  if (room.creator === decoded.userId && room.players.length >= 2) {
    startBtn.classList.remove("hidden");
  } else {
    startBtn.classList.add("hidden");
  }
});

// Handle Start Game button click
document.getElementById("startBtn").addEventListener("click", () => {
  socket.emit("startGame", { roomId }, (res) => {
    if (!res || !res.success) {
      alert(res?.message || "Failed to start game");
    }
  });
});

// Listen for game start event
socket.on("gameStart", (data) => {
  console.log("Game starting, redirecting to game page...", data);
  window.location.href = `/game.html?roomId=${data.roomId}`;
});

// Utility: decode JWT payload (client-side only)
function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}
