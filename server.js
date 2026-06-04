const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const bodyParser = require("body-parser");
const { connectRedis } = require("./src/utils/redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const { verifyToken } = require("./src/middleware/auth");
const socketHandler = require("./src/sockets");
const apiRoutes = require("./src/routes/apiRoutes");
const { loadRoomsFromRedis } = require("./src/game/roomManager");

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());
app.use(apiRoutes);
app.use(express.static(path.join(__dirname, "public")));

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.startsWith("Bearer ") &&
      socket.handshake.headers.authorization.substring(7);

  if (!token) {
    return next(new Error("Authentication error: missing token"));
  }

  const user = verifyToken(token);
  if (!user) {
    return next(new Error("Authentication error: invalid token"));
  }

  socket.user = user;
  return next();
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const { pubClient, subClient } = await connectRedis();
    io.adapter(createAdapter(pubClient, subClient));

    try {
      await loadRoomsFromRedis();
    } catch (e) {
      console.warn("Could not load rooms from Redis before starting sockets:", e.message);
    }

    socketHandler(io);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

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

start();
