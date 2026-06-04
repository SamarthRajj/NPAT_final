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

// Game state
let currentGameState = null;
let currentRoom = null;
let isAdmin = false;
let currentUser = null;
let lastSeenEventId = 0;

// Initialize user info
const decoded = parseJwt(token);
currentUser = decoded;

// DOM elements
const gameStatus = document.getElementById("gameStatus");
const gameContent = document.getElementById("gameContent");
const adminControls = document.getElementById("adminControls");
const currentRound = document.getElementById("currentRound");
const totalRounds = document.getElementById("totalRounds");
const playerCount = document.getElementById("playerCount");
const currentLetter = document.getElementById("currentLetter");
const submissionForm = document.getElementById("submissionForm");
const submitBtn = document.getElementById("submitBtn");
const playersList = document.getElementById("playersList");
const startRoundBtn = document.getElementById("startRoundBtn");
const nextRoundBtn = document.getElementById("nextRoundBtn");

// Socket connection
socket.on("connect", () => {
  console.log("Connected to game as userId:", currentUser.userId, "username:", currentUser.username);
  
  // Subscribe to the game room
  socket.emit("subscribeRoom", { roomId }, (res) => {
    if (!res || !res.success) {
      console.error("Failed to subscribe to game room:", res?.message);
      alert("Failed to join game room");
    } else {
      console.log("Successfully subscribed to game room");
      // Get initial game state
      socket.emit("getGameState", { roomId }, (res) => {
        if (res && res.success) {
          if (res.eventId != null) lastSeenEventId = res.eventId;
          updateGameState(res.gameState, res.room);
        }
      });
    }
  });
});

// Game event listeners
socket.on("roundStarted", (data) => {
  applyServerEvent(data);
  showGameContent();
  resetForm();
});

socket.on("answerSubmitted", (data) => {
  applyServerEvent(data);
});

socket.on("allPlayersSubmitted", (data) => {
  applyServerEvent(data);
  showNextRoundButton();
});

socket.on("roundCompleted", (data) => {
  applyServerEvent(data);
  if (data.completedRound != null) {
    showRoundResults(data.completedRound);
  }
});

socket.on("gameStateUpdate", (data) => {
  if (data.eventId != null && data.eventId <= lastSeenEventId) return;
  if (data.eventId != null) lastSeenEventId = data.eventId;
  if (data.delta && currentGameState) {
    Object.assign(currentGameState, data.delta);
    if (data.room) currentRoom = data.room;
    refreshUIFromState();
  } else if (data.delta) {
    currentGameState = { ...data.delta };
    if (data.room) currentRoom = data.room;
    refreshUIFromState();
  }
});

function applyServerEvent(data) {
  if (data.eventId != null && data.eventId <= lastSeenEventId) return;
  if (data.eventId != null) lastSeenEventId = data.eventId;
  updateGameState(data.gameState, data.room);
}

function refreshUIFromState() {
  if (!currentGameState) return;
  currentRound.textContent = currentGameState.round;
  totalRounds.textContent = currentGameState.totalRounds;
  if (currentGameState.currentLetter) {
    currentLetter.textContent = currentGameState.currentLetter;
  }
  if (currentRoom) {
    playerCount.textContent = currentRoom.players.length;
    isAdmin = currentRoom.creator === currentUser.userId;
    if (isAdmin && currentGameState.status !== "finished") {
      adminControls.classList.remove("hidden");
    } else {
      adminControls.classList.add("hidden");
    }
  }
  updatePlayersStatus(currentGameState, currentRoom);
  updateGameStatus(currentGameState);
  setFinishedUI(currentGameState.status === "finished");
  if (currentGameState.status === "finished" && currentGameState.finalScores) {
    showFinalResults(currentGameState);
  }
}

function setFinishedUI(finished) {
  if (finished) {
    submissionForm.style.display = "none";
    adminControls.style.display = "none";
    currentLetter.parentElement.style.display = "none";
    startRoundBtn.disabled = true;
    nextRoundBtn.classList.add("hidden");
  }
}

socket.on("gameFinished", (data) => {
  applyServerEvent(data);
  if (data.completedRound != null) {
    showRoundResults(data.completedRound);
  }
  showFinalResults(data.gameState);
  nextRoundBtn.classList.add("hidden");
});

// Update game state
function updateGameState(gameState, room) {
  currentGameState = gameState;
  currentRoom = room;
  
  console.log("updateGameState called with status:", gameState.status, "round:", gameState.round);
  
  // Update round info
  currentRound.textContent = gameState.round;
  totalRounds.textContent = gameState.totalRounds;
  
  // Update current letter
  if (gameState.currentLetter) {
    currentLetter.textContent = gameState.currentLetter;
  }
  
  // Update player count
  if (room) {
    playerCount.textContent = room.players.length;
    isAdmin = room.creator === currentUser.userId;
    
    // Show/hide admin controls
    if (isAdmin) {
      adminControls.classList.remove("hidden");
    } else {
      adminControls.classList.add("hidden");
    }
  }
  
  // Update players status
  updatePlayersStatus(gameState, room);
  
  // Update game status
  updateGameStatus(gameState);
  
  setFinishedUI(gameState.status === "finished");

  if (gameState.status === "finished" && gameState.finalScores) {
    showFinalResults(gameState);
  }
}

function updatePlayersStatus(gameState, room) {
  playersList.innerHTML = "";
  
  if (room && room.players) {
    room.players.forEach(player => {
      const playerDiv = document.createElement("div");
      const submitted = gameState.submittedPlayers || [];
      const isSubmitted = Array.isArray(submitted)
        ? submitted.includes(player.userId)
        : submitted.has(player.userId);
      const isCurrentUser = player.userId === currentUser.userId;
      
      playerDiv.className = `player-status ${isSubmitted ? 'submitted' : 'waiting'}`;
      playerDiv.textContent = `${player.username}${isCurrentUser ? ' (You)' : ''} — ${isSubmitted ? 'Submitted' : 'Waiting'}`;
      
      playersList.appendChild(playerDiv);
    });
  }
}

function updateGameStatus(gameState) {
  const statusDiv = gameStatus;
  
  if (gameState.status === "waiting") {
    statusDiv.className = "game-status status-waiting";
    statusDiv.textContent = "Waiting for admin to start the game...";
    hideGameContent();
  } else if (gameState.status === "in-progress") {
    statusDiv.className = "game-status status-playing";
    statusDiv.textContent = gameState.currentLetter
      ? `Round ${gameState.round} — letter ${gameState.currentLetter}`
      : `Round ${gameState.round} — waiting for admin to start`;
    showGameContent();
  } else if (gameState.status === "finished") {
    statusDiv.className = "game-status status-finished";
    statusDiv.textContent = "Game Finished";
    showGameContent();
  }
}

function showGameContent() {
  gameContent.classList.remove("hidden");
  
  // Only show game elements if game is not finished
  if (!currentGameState || currentGameState.status !== "finished") {
    submissionForm.style.display = "grid";
    adminControls.style.display = "block";
    currentLetter.parentElement.style.display = "block";
  }
}

function hideGameContent() {
  gameContent.classList.add("hidden");
}

function showNextRoundButton() {
  if (isAdmin) {
    nextRoundBtn.classList.remove("hidden");
  }
}

function resetForm() {
  submissionForm.reset();
  submitBtn.disabled = false;
  submitBtn.textContent = "Submit Answer";
}

function showRoundResults(roundNumber) {
  // Fetch and display round results
  socket.emit("getGameResults", { roomId }, (res) => {
    if (res && res.success && res.roundResults) {
      const roundResult = res.roundResults.find(r => r.round === roundNumber);
      if (roundResult) {
        displayRoundResults(roundResult);
      }
    }
  });
}

function displayRoundResults(roundResult) {
  const resultsDiv = document.createElement("div");
  resultsDiv.className = "round-results";
  resultsDiv.innerHTML = `
    <h3>Round ${roundResult.round} Results (Letter: ${roundResult.letter})</h3>
    <div class="results-content">
      ${Object.keys(roundResult.results.submissions).map(userId => {
        const submission = roundResult.results.submissions[userId];
        const scores = roundResult.results.scores[userId];
        const player = currentRoom.players.find(p => p.userId === userId);
        return `
          <div class="player-result">
            <h4>${player ? player.username : 'Unknown Player'}</h4>
            <div class="answers">
              <span class="answer">Name: ${submission.name} (${scores.name} pts)</span>
              <span class="answer">Place: ${submission.place} (${scores.place} pts)</span>
              <span class="answer">Animal: ${submission.animal} (${scores.animal} pts)</span>
              <span class="answer">Thing: ${submission.thing} (${scores.thing} pts)</span>
            </div>
            <div class="total-score">Total: ${scores.total} points</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  // Insert results before admin controls
  adminControls.parentNode.insertBefore(resultsDiv, adminControls);
}

function showFinalResults(gameState) {
  console.log("showFinalResults called with:", gameState);
  if (gameState.finalScores) {
    console.log("Final scores found:", gameState.finalScores);
    // Hide submission form, current letter, and admin controls when game is finished
    submissionForm.style.display = "none";
    adminControls.style.display = "none";
    currentLetter.parentElement.style.display = "none";
    
    // Remove any existing final results to avoid duplicates
    const existingFinalResults = document.querySelector(".final-results");
    if (existingFinalResults) {
      existingFinalResults.remove();
    }
    
    const finalResultsDiv = document.createElement("div");
    finalResultsDiv.className = "final-results";
    
    // Sort players by final score
    const sortedPlayers = Object.keys(gameState.finalScores)
      .map(userId => ({
        userId,
        player: currentRoom.players.find(p => p.userId === userId),
        score: gameState.finalScores[userId]
      }))
      .sort((a, b) => b.score - a.score);
    
    finalResultsDiv.innerHTML = `
      <h2>Final Standings</h2>
      <div class="leaderboard">
        ${sortedPlayers.map((player, index) => `
          <div class="leaderboard-entry ${index === 0 ? 'winner' : ''}">
            <span class="rank">#${index + 1}</span>
            <span class="player-name">${player.player ? player.player.username : 'Unknown'}</span>
            <span class="final-score">${player.score} pts</span>
          </div>
        `).join('')}
      </div>
      <div class="final-results-actions">
        <button id="viewDetailedResultsBtn" class="btn btn-primary">View Results</button>
      </div>
    `;
    
    gameContent.appendChild(finalResultsDiv);
    
    // Add event listener for the view results button
    const viewResultsBtn = document.getElementById("viewDetailedResultsBtn");
    if (viewResultsBtn) {
      viewResultsBtn.addEventListener("click", () => {
        window.location.href = `/results.html?roomId=${roomId}`;
      });
    }
  } else {
    console.log("No final scores found in gameState:", gameState);
  }
}

// Form submission
submissionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  if (!currentGameState || !currentGameState.currentLetter) {
    alert("No active round!");
    return;
  }
  
  const submission = {
    name: document.getElementById("nameInput").value.trim(),
    place: document.getElementById("placeInput").value.trim(),
    animal: document.getElementById("animalInput").value.trim(),
    thing: document.getElementById("thingInput").value.trim()
  };
  
  // Validate all fields are filled
  if (!submission.name || !submission.place || !submission.animal || !submission.thing) {
    alert("Please fill in all fields!");
    return;
  }
  
  // Validate they start with the current letter
  const letter = currentGameState.currentLetter.toLowerCase();
  if (!submission.name.toLowerCase().startsWith(letter) ||
      !submission.place.toLowerCase().startsWith(letter) ||
      !submission.animal.toLowerCase().startsWith(letter) ||
      !submission.thing.toLowerCase().startsWith(letter)) {
    alert(`All answers must start with the letter "${currentGameState.currentLetter}"!`);
    return;
  }
  
  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";
  
  // Submit answer
  socket.emit("submitAnswer", { roomId, submission }, (res) => {
    if (res && res.success) {
      console.log("Answer submitted successfully!");
      submitBtn.textContent = "✓ Submitted";
      // Clear form
      submissionForm.reset();
    } else {
      console.error("Failed to submit answer:", res?.message);
      alert(res?.message || "Failed to submit answer");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Answer";
    }
  });
});

// Admin controls
startRoundBtn.addEventListener("click", () => {
  socket.emit("startRound", { roomId }, (res) => {
    if (res && res.success) {
      console.log("Round started successfully!");
      startRoundBtn.disabled = true;
      startRoundBtn.textContent = "Round Started";
    } else {
      console.error("Failed to start round:", res?.message);
      alert(res?.message || "Failed to start round");
    }
  });
});

nextRoundBtn.addEventListener("click", () => {
  console.log("Next round button clicked, current round:", currentGameState?.round);
  socket.emit("nextRound", { roomId }, (res) => {
    console.log("Next round response:", res);
    if (res && res.success) {
      if (res.gameFinished) {
        console.log("Game finished! Should show final results.");
        // Hide the next round button since game is finished
        nextRoundBtn.classList.add("hidden");
        // The gameFinished event should handle showing final results
      } else {
        console.log("Next round initiated!");
        nextRoundBtn.classList.add("hidden");
        startRoundBtn.disabled = false;
        startRoundBtn.textContent = "Start Round";
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Answer";
        
        // Remove previous round results
        const existingResults = document.querySelector(".round-results");
        if (existingResults) {
          existingResults.remove();
        }
      }
    } else {
      console.error("Failed to start next round:", res?.message);
      alert(res?.message || "Failed to start next round");
    }
  });
});

// Handle disconnect
socket.on("disconnect", () => {
  console.log("Disconnected from game");
  gameStatus.textContent = "Disconnected from server...";
});

// Handle connection errors
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  alert("Connection error: " + error.message);
});