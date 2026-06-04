const lobbyEvents = require("./lobbyEvents");
const gameEvents = require("./gameEvents");
const resultEvents = require("./resultEvents");

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.userId}`);
    lobbyEvents(io, socket);
    gameEvents(io, socket);
    resultEvents(io, socket);
  });
}

module.exports = socketHandler;