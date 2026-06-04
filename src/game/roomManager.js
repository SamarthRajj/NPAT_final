const rooms = new Map();

function debugPrintRooms(action, roomId) {
  try {
    const snapshot = Array.from(rooms.values()).map((r) => ({
      id: r.id,
      creator: r.creator,
      players: r.players.map((p) => ({ userId: p.userId, username: p.username })),
      status: r.status,
      gameState: r.gameState ? {
        round: r.gameState.round,
        totalRounds: r.gameState.totalRounds,
        currentLetter: r.gameState.currentLetter,
        submittedPlayers: Array.from(r.gameState.submittedPlayers),
        countdownActive: r.gameState.countdownActive
      } : null
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
    status: "waiting",
    gameState: null, // Will be initialized when game starts
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

function initializeGameState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { success: false, message: "Room not found" };

  const gameState = {
    roomId: roomId,
    status: "in-progress",
    round: 1,
    totalRounds: 3,
    currentLetter: "",
    submissions: {},
    submittedPlayers: new Set(),
    countdownActive: false,
    countdownEndsAt: null,
    roundResults: [],
    usedLetters: new Set(),
    version: 0,
    lastEventId: 0
  };

  room.gameState = gameState;
  room.status = "in-progress";
  
  console.log(`[Game] Initialized game state for roomId=${roomId}`);
  debugPrintRooms("initializeGameState", roomId);
  return { success: true, gameState };
}

function generateUniqueLetter(usedLetters) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const availableLetters = letters.split('').filter(letter => !usedLetters.has(letter));
  
  if (availableLetters.length === 0) {
    // If all letters used, reset and start over
    usedLetters.clear();
    return letters[Math.floor(Math.random() * letters.length)];
  }
  
  return availableLetters[Math.floor(Math.random() * availableLetters.length)];
}

function bumpGameState(room) {
  room.gameState.version = (room.gameState.version || 0) + 1;
  room.gameState.lastEventId = (room.gameState.lastEventId || 0) + 1;
  return room.gameState.lastEventId;
}

function isRoundAlreadyScored(gameState, roundNumber) {
  return gameState.roundResults.some((r) => r.round === roundNumber);
}

function serializeGameState(gameState) {
  return {
    ...gameState,
    submittedPlayers: Array.from(gameState.submittedPlayers),
    usedLetters: Array.from(gameState.usedLetters || []),
  };
}

function startRound(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.gameState) {
    return { success: false, message: "Room or game state not found" };
  }

  if (room.gameState.status === "finished") {
    return { success: false, message: "Game has already finished" };
  }

  if (isRoundAlreadyScored(room.gameState, room.gameState.round)) {
    return {
      success: false,
      message: "This round is complete. Use Next Round to continue.",
    };
  }

  // Generate unique random letter (avoid duplicates)
  const randomLetter = generateUniqueLetter(room.gameState.usedLetters);
  room.gameState.usedLetters.add(randomLetter);

  // Reset round state
  room.gameState.currentLetter = randomLetter;
  room.gameState.submissions = {};
  room.gameState.submittedPlayers.clear();
  room.gameState.countdownActive = false;
  room.gameState.countdownEndsAt = null;

  bumpGameState(room);

  console.log(`[Game] Started round ${room.gameState.round} with letter '${randomLetter}' for roomId=${roomId}`);
  debugPrintRooms("startRound", roomId);
  
  return { 
    success: true, 
    gameState: serializeGameState(room.gameState),
    eventId: room.gameState.lastEventId,
  };
}

function submitAnswer(roomId, userId, submission) {
  const room = rooms.get(roomId);
  if (!room || !room.gameState) {
    return { success: false, message: "Room or game state not found" };
  }

  if (room.gameState.status === "finished") {
    return { success: false, message: "Game has already finished" };
  }

  if (room.gameState.submittedPlayers.has(userId)) {
    return { success: false, message: "Already submitted for this round" };
  }

  if (!room.gameState.currentLetter) {
    return { success: false, message: "No active round. Wait for admin to start the round." };
  }

  // Validate submission format
  const { name, place, animal, thing } = submission;
  if (!name || !place || !animal || !thing) {
    return { success: false, message: "All fields (name, place, animal, thing) are required" };
  }

  // Store submission
  room.gameState.submissions[userId] = {
    name: name.trim(),
    place: place.trim(),
    animal: animal.trim(),
    thing: thing.trim(),
    submittedAt: Date.now()
  };

  room.gameState.submittedPlayers.add(userId);
  bumpGameState(room);

  console.log(`[Game] User ${userId} submitted answer for round ${room.gameState.round} in roomId=${roomId}`);
  debugPrintRooms("submitAnswer", roomId);

  return { 
    success: true, 
    gameState: serializeGameState(room.gameState),
    eventId: room.gameState.lastEventId,
  };
}

function calculateRoundResults(submissions, currentLetter) {
  const results = {
    letter: currentLetter,
    submissions: {},
    scores: {},
    totalScores: {}
  };

  // Process each submission
  Object.keys(submissions).forEach(userId => {
    const submission = submissions[userId];
    results.submissions[userId] = submission;
    
    // Initialize scores for this user
    results.scores[userId] = {
      name: 0,
      place: 0,
      animal: 0,
      thing: 0,
      total: 0
    };
  });

  // Calculate scores based on uniqueness and correctness
  const categories = ['name', 'place', 'animal', 'thing'];
  
  categories.forEach(category => {
    const answers = {};
    
    // Collect all answers for this category
    Object.keys(submissions).forEach(userId => {
      const answer = submissions[userId][category].toLowerCase();
      if (!answers[answer]) {
        answers[answer] = [];
      }
      answers[answer].push(userId);
    });

    // Score based on uniqueness (unique answers get more points)
    Object.keys(answers).forEach(answer => {
      const users = answers[answer];
      const points = users.length === 1 ? 10 : (users.length === 2 ? 5 : 0);
      
      users.forEach(userId => {
        results.scores[userId][category] = points;
        results.scores[userId].total += points;
      });
    });
  });

  // Calculate total scores for each user
  Object.keys(results.scores).forEach(userId => {
    results.totalScores[userId] = results.scores[userId].total;
  });

  return results;
}

function nextRound(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.gameState) {
    return { success: false, message: "Room or game state not found" };
  }

  if (room.gameState.status === "finished") {
    return { success: false, message: "Game has already finished" };
  }

  console.log(`[Game] nextRound called for roomId=${roomId}, current round=${room.gameState.round}, totalRounds=${room.gameState.totalRounds}`);

  // Calculate and store results for current round
  if (Object.keys(room.gameState.submissions).length > 0) {
    const roundResults = calculateRoundResults(room.gameState.submissions, room.gameState.currentLetter);
    room.gameState.roundResults.push({
      round: room.gameState.round,
      letter: room.gameState.currentLetter,
      results: roundResults
    });
    
    console.log(`[Game] Calculated results for round ${room.gameState.round} in roomId=${roomId}`, roundResults);
  }

  const completedRound = room.gameState.round;
  bumpGameState(room);

  // Check if this was the final round (round 3) - if so, game is finished
  if (completedRound >= room.gameState.totalRounds) {
    const finalScores = calculateFinalScores(room.gameState.roundResults);
    room.gameState.finalScores = finalScores;
    room.gameState.status = "finished";
    room.status = "finished";
    bumpGameState(room);
    console.log(`[Game] Game finished for roomId=${roomId} after round ${completedRound}`, finalScores);
    return {
      success: true,
      gameFinished: true,
      completedRound,
      gameState: serializeGameState(room.gameState),
      eventId: room.gameState.lastEventId,
    };
  }

  // Move to next round
  room.gameState.round++;
  bumpGameState(room);
  console.log(`[Game] Moving to round ${room.gameState.round} for roomId=${roomId}`);
  
  return {
    success: true,
    gameFinished: false,
    completedRound,
    gameState: serializeGameState(room.gameState),
    eventId: room.gameState.lastEventId,
  };
}

function calculateFinalScores(roundResults) {
  const finalScores = {};
  
  // Initialize final scores
  roundResults.forEach(round => {
    Object.keys(round.results.totalScores).forEach(userId => {
      if (!finalScores[userId]) {
        finalScores[userId] = 0;
      }
      finalScores[userId] += round.results.totalScores[userId];
    });
  });

  return finalScores;
}

function getGameResults(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.gameState) {
    return { success: false, message: "Room or game state not found" };
  }

  return {
    success: true,
    roundResults: room.gameState.roundResults,
    finalScores: room.gameState.finalScores || {},
    gameState: room.gameState
  };
}

module.exports = { 
  createRoom, 
  joinRoom, 
  getRoom, 
  removePlayerFromRoom,
  initializeGameState,
  startRound,
  submitAnswer,
  nextRound,
  getGameResults,
  serializeGameState,
  bumpGameState,
};