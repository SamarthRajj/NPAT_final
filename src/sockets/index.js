const lobbyEvents = require("./lobbyEvents");

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.userId}`);
    lobbyEvents(io, socket);
  });
}

module.exports = socketHandler;
