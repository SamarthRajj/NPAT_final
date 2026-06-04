const { getComprehensiveResults } = require("../game/resultManager");

function resultEvents(io, socket) {
  // Get comprehensive results for a room
  socket.on("getComprehensiveResults", ({ roomId }, callback) => {
    console.log(`[Results] getComprehensiveResults requested by userId=${socket.user.userId} roomId=${roomId}`);
    
    try {
      const results = getComprehensiveResults(roomId);
      if (results.success) {
        console.log(`[Results] getComprehensiveResults success for roomId=${roomId}`);
        if (callback) callback({ success: true, ...results });
      } else {
        console.warn(`[Results] getComprehensiveResults failed roomId=${roomId} reason=${results.message}`);
        if (callback) callback({ success: false, message: results.message });
      }
    } catch (error) {
      console.error(`[Results] getComprehensiveResults error roomId=${roomId}`, error);
      if (callback) callback({ success: false, message: "Internal server error" });
    }
  });

  // Notify all players when game finishes (for results page updates)
  socket.on("notifyGameFinished", ({ roomId }, callback) => {
    console.log(`[Results] notifyGameFinished requested by userId=${socket.user.userId} roomId=${roomId}`);
    
    // Emit to all players in the room that the game has finished
    io.to(roomId).emit("gameFinishedNotification", { 
      roomId,
      timestamp: Date.now(),
      message: "Game has finished! Check the results page for detailed analysis."
    });
    
    if (callback) callback({ success: true });
  });
}

module.exports = resultEvents;
