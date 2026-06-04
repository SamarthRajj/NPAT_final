// Simulated login: generate token via fetch
async function login(username) {
  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    return true;
  }
  return false;
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  if (!username) return alert("Enter username");

  const success = await login(username);
  if (success) {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("lobbyActions").classList.remove("hidden");
    connectSocket();
  } else {
    alert("Login failed");
  }
});

let socket;
function connectSocket() {
  const token = localStorage.getItem("token");
  if (!token) return alert("No token found");

  socket = io({
    auth: { token },
  });

  socket.on("connect", () => {
    document.getElementById("status").textContent = "Connected";
  });

  socket.on("connect_error", (err) => {
    document.getElementById("status").textContent = `Connection error: ${err.message}`;
    console.error("Socket connect_error", err);
  });

  socket.on("disconnect", () => {
    document.getElementById("status").textContent = "Disconnected";
  });

  // Room actions
  document.getElementById("createBtn").addEventListener("click", () => {
    const roomId = document.getElementById("roomId").value.trim();
    socket.emit("createRoom", { roomId }, (res) => {
      if (res.success) {
        localStorage.setItem("roomId", roomId);
        window.location.href = "/lobby.html";
      } else {
        alert(res.message);
      }
    });
  });

  document.getElementById("joinBtn").addEventListener("click", () => {
    const roomId = document.getElementById("roomId").value.trim();
    socket.emit("joinRoom", { roomId }, (res) => {
      if (res.success) {
        localStorage.setItem("roomId", roomId);
        window.location.href = "/lobby.html";
      } else {
        alert(res.message);
      }
    });
  });
}
