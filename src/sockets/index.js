const lobbyEvents = require("./lobbyEvents");
const gameEvents = require("./gameEvents");
const resultEvents = require("./resultEvents");

function socketHandler(io) {
  io.on("connection", (socket) => {
    const userId = socket.user?.userId || "unknown";
    console.log(`User connected: ${userId}`);
    lobbyEvents(io, socket);
    gameEvents(io, socket);
    resultEvents(io, socket);
  });
}

module.exports = socketHandler;