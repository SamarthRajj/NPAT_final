const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { verifyToken } = require("./src/middleware/auth");
const bodyParser = require("body-parser");
const { generateToken } = require("./src/middleware/auth");
const socketHandler = require("./src/sockets");

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());
const io = new Server(server,{
    cors: {
    origin: "*", 
  },
});
app.post("/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  const userId = Date.now().toString(); // unique for now
  const token = generateToken({ userId, username });
  res.json({ token });
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

  socket.user = user; // attach decoded user info
  next();
});

socketHandler(io);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});
