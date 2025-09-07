const params = new URLSearchParams(window.location.search);
const roomId = params.get("roomId");

document.getElementById("roomId").textContent = roomId;

const token = localStorage.getItem("token");

if (!token || !roomId) {
  alert("Missing token or roomId");
  window.location.href = "/";
}

const socket = io({ auth: { token } });

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

// You can now handle actual game events here
socket.on("connect", () => {
  const decoded = parseJwt(token);
  console.log("Connected to game as userId:", decoded.userId, "username:", decoded.username);
  
  // Subscribe to the game room
  socket.emit("subscribeRoom", { roomId }, (res) => {
    if (!res || !res.success) {
      console.error("Failed to subscribe to game room:", res?.message);
      alert("Failed to join game room");
    } else {
      console.log("Successfully subscribed to game room");
    }
  });
});
