const params = new URLSearchParams(window.location.search);
const roomId = params.get("roomId");
const token = localStorage.getItem("token");

if (!token || !roomId) {
  alert("Missing token or roomId");
  window.location.href = "/";
}

function parseJwt(tok) {
  const base64Url = tok.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

parseJwt(token);

let gameResults = null;

const resultsContainer = document.getElementById("resultsContainer");
const loadingSpinner = document.getElementById("loadingSpinner");
const errorMessage = document.getElementById("errorMessage");
const pageRoomId = document.getElementById("pageRoomId");

const socket = io({ auth: { token } });

document.addEventListener("DOMContentLoaded", () => {
  if (pageRoomId) pageRoomId.textContent = roomId;
  loadGameResults();
});

socket.on("connect", () => {
  socket.emit("subscribeRoom", { roomId }, () => {});
});

socket.on("gameFinishedNotification", () => {
  loadGameResults();
});

function loadGameResults() {
  showLoading();

  fetch(`/api/results/${roomId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        gameResults = data;
        displayResults(data);
        hideLoading();
      } else {
        showError(data.message || "Failed to load results");
      }
    })
    .catch(() => {
      showError("Failed to load results. Please try again.");
    });
}

function displayResults(results) {
  resultsContainer.innerHTML = "";
  resultsContainer.appendChild(createGameHeader(results));
  resultsContainer.appendChild(createGameStats(results.gameStats));
  resultsContainer.appendChild(createLeaderboard(results.leaderboard));
  resultsContainer.appendChild(createRoundResults(results.roundResults, results.players));
  resultsContainer.appendChild(createActionButtons());
}

function createGameHeader(results) {
  const headerDiv = document.createElement("div");
  headerDiv.className = "results-header";
  headerDiv.innerHTML = `
    <h1>Game Results</h1>
    <div class="game-info">
      <span>Room ${results.roomId}</span>
      <span>${results.gameState.completedRounds}/${results.gameState.totalRounds} rounds</span>
      <span>${results.gameStats.totalPlayers} players</span>
    </div>
  `;
  return headerDiv;
}

function createGameStats(stats) {
  const statsDiv = document.createElement("div");
  statsDiv.className = "game-stats panel";
  statsDiv.innerHTML = `
    <h2>Statistics</h2>
    <div class="stats-grid">
      <div class="stat-item"><span class="stat-label">Players</span><span class="stat-value">${stats.totalPlayers}</span></div>
      <div class="stat-item"><span class="stat-label">Rounds</span><span class="stat-value">${stats.completedRounds}</span></div>
      <div class="stat-item"><span class="stat-label">Average</span><span class="stat-value">${stats.averageScore}</span></div>
      <div class="stat-item"><span class="stat-label">Highest</span><span class="stat-value">${stats.highestScore}</span></div>
      <div class="stat-item"><span class="stat-label">Lowest</span><span class="stat-value">${stats.lowestScore}</span></div>
      <div class="stat-item"><span class="stat-label">Submissions</span><span class="stat-value">${stats.totalSubmissions}</span></div>
    </div>
  `;
  return statsDiv;
}

function createLeaderboard(leaderboard) {
  const leaderboardDiv = document.createElement("div");
  leaderboardDiv.className = "final-leaderboard panel";
  leaderboardDiv.innerHTML = `
    <h2>Leaderboard</h2>
    <div class="leaderboard">
      ${leaderboard
        .map(
          (player) => `
        <div class="leaderboard-entry ${player.isWinner ? "winner" : ""}">
          <span class="rank">#${player.rank}</span>
          <span class="player-name">${player.username}</span>
          <span class="player-score">${player.score} pts</span>
        </div>`
        )
        .join("")}
    </div>
  `;
  return leaderboardDiv;
}

function createRoundResults(roundResults, players) {
  const roundsDiv = document.createElement("div");
  roundsDiv.className = "round-results-section panel";
  roundsDiv.innerHTML = `<h2>Round Breakdown</h2><div class="rounds-container"></div>`;
  const container = roundsDiv.querySelector(".rounds-container");

  roundResults.forEach((round) => {
    const el = document.createElement("div");
    el.className = "round-result";
    el.innerHTML = renderRoundHtml(round, players);
    container.appendChild(el);
  });

  return roundsDiv;
}

function renderRoundHtml(round, players) {
  const sortedPlayers = Object.keys(round.totalScores || {})
    .map((userId) => ({
      userId,
      player: players.find((p) => p.userId === userId),
      score: round.totalScores[userId],
      submission: round.submissions[userId],
      categoryScores: round.scores[userId],
    }))
    .filter((p) => p.submission)
    .sort((a, b) => b.score - a.score);

  return `
    <div class="round-header">
      <h3>Round ${round.round}</h3>
      <span class="round-letter">${round.letter}</span>
    </div>
    <div class="round-content">
      ${sortedPlayers
        .map((entry) => {
          const name = entry.player?.username || "Unknown";
          const cs = entry.categoryScores || {};
          return `
        <div class="player-round-result">
          <div class="player-header">
            <span class="player-name">${name}</span>
            <span class="round-score">${entry.score} pts</span>
          </div>
          <div class="player-answers">
            ${["name", "place", "animal", "thing"]
              .map(
                (cat) => `
              <div class="answer-item">
                <span class="answer-label">${cat}</span>
                <span class="answer-value">${entry.submission[cat]}</span>
                <span class="answer-score">${cs[cat] ?? 0} pts</span>
              </div>`
              )
              .join("")}
          </div>
        </div>`;
        })
        .join("")}
    </div>`;
}

function createActionButtons() {
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "action-buttons";
  actionsDiv.innerHTML = `
    <button type="button" class="btn btn-secondary" data-action="back">Back to Game</button>
    <button type="button" class="btn btn-primary" data-action="new">New Game</button>
    <button type="button" class="btn btn-ghost" data-action="share">Copy Summary</button>
  `;

  actionsDiv.querySelector('[data-action="back"]').addEventListener("click", () => {
    window.location.href = `/game.html?roomId=${roomId}`;
  });

  actionsDiv.querySelector('[data-action="new"]').addEventListener("click", () => {
    window.location.href = "/";
  });

  actionsDiv.querySelector('[data-action="share"]').addEventListener("click", copySummary);

  return actionsDiv;
}

function copySummary() {
  if (!gameResults) return;
  const lines = [`NPAT Results — Room ${gameResults.roomId}`, "", "Leaderboard:"];
  gameResults.leaderboard.forEach((p) => {
    lines.push(`#${p.rank} ${p.username}: ${p.score} pts`);
  });
  navigator.clipboard.writeText(lines.join("\n")).then(() => {
    alert("Summary copied to clipboard.");
  });
}

function showLoading() {
  loadingSpinner.style.display = "block";
  resultsContainer.style.display = "none";
  errorMessage.style.display = "none";
}

function hideLoading() {
  loadingSpinner.style.display = "none";
  resultsContainer.style.display = "block";
}

function showError(message) {
  loadingSpinner.style.display = "none";
  resultsContainer.style.display = "none";
  errorMessage.style.display = "block";
  errorMessage.textContent = message;
}

socket.on("connect_error", (error) => {
  showError("Connection error: " + error.message);
});
