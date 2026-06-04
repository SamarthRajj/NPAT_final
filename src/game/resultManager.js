const { getRoom } = require('./roomManager');

/**
 * Result Manager - Handles formatting and organizing game results for display
 */

/**
 * Get comprehensive game results for a room
 * @param {string} roomId - The room ID
 * @returns {Object} Formatted results data
 */
function getComprehensiveResults(roomId) {
  const room = getRoom(roomId);
  if (!room || !room.gameState) {
    return { success: false, message: "Room or game state not found" };
  }

  const gameState = room.gameState;

  if (gameState.status !== "finished") {
    return {
      success: false,
      message: "Results available after all 3 rounds are complete.",
    };
  }
  const players = room.players;

  // Format round results
  const formattedRoundResults = gameState.roundResults.map(round => ({
    round: round.round,
    letter: round.letter,
    submissions: formatRoundSubmissions(round.results.submissions, players),
    scores: round.results.scores,
    totalScores: round.results.totalScores
  }));

  // Format final leaderboard
  const leaderboard = formatLeaderboard(gameState.finalScores, players);

  // Calculate game statistics
  const gameStats = calculateGameStats(gameState, players);

  return {
    success: true,
    roomId: roomId,
    gameState: {
      status: gameState.status,
      totalRounds: gameState.totalRounds,
      completedRounds: gameState.roundResults.length
    },
    players: players.map(p => ({ userId: p.userId, username: p.username })),
    roundResults: formattedRoundResults,
    finalScores: gameState.finalScores,
    leaderboard: leaderboard,
    gameStats: gameStats
  };
}

/**
 * Format round submissions with player names
 * @param {Object} submissions - Raw submissions data
 * @param {Array} players - Array of player objects
 * @returns {Object} Formatted submissions with player names
 */
function formatRoundSubmissions(submissions, players) {
  const formatted = {};
  
  Object.keys(submissions).forEach(userId => {
    const player = players.find(p => p.userId === userId);
    formatted[userId] = {
      ...submissions[userId],
      playerName: player ? player.username : 'Unknown Player'
    };
  });

  return formatted;
}

/**
 * Format leaderboard with player names and rankings
 * @param {Object} finalScores - Final scores for all players
 * @param {Array} players - Array of player objects
 * @returns {Array} Sorted leaderboard entries
 */
function formatLeaderboard(finalScores, players) {
  if (!finalScores || Object.keys(finalScores).length === 0) {
    return [];
  }
  return Object.keys(finalScores)
    .map(userId => ({
      userId,
      username: players.find(p => p.userId === userId)?.username || 'Unknown Player',
      score: finalScores[userId]
    }))
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      ...player,
      rank: index + 1,
      isWinner: index === 0
    }));
}

/**
 * Calculate game statistics
 * @param {Object} gameState - Game state object
 * @param {Array} players - Array of player objects
 * @returns {Object} Game statistics
 */
function calculateGameStats(gameState, players) {
  const stats = {
    totalPlayers: players.length,
    totalRounds: gameState.totalRounds,
    completedRounds: gameState.roundResults.length,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    totalSubmissions: 0
  };

  if (gameState.finalScores && Object.keys(gameState.finalScores).length > 0) {
    const scores = Object.values(gameState.finalScores);
    stats.highestScore = Math.max(...scores);
    stats.lowestScore = Math.min(...scores);
    stats.averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  // Count total submissions across all rounds
  gameState.roundResults.forEach(round => {
    stats.totalSubmissions += Object.keys(round.results.submissions).length;
  });

  return stats;
}

/**
 * Get detailed round analysis
 * @param {string} roomId - The room ID
 * @param {number} roundNumber - Round number to analyze
 * @returns {Object} Detailed round analysis
 */
function getRoundAnalysis(roomId, roundNumber) {
  const room = getRoom(roomId);
  if (!room || !room.gameState) {
    return { success: false, message: "Room or game state not found" };
  }

  const roundResult = room.gameState.roundResults.find(r => r.round === roundNumber);
  if (!roundResult) {
    return { success: false, message: "Round not found" };
  }

  const players = room.players;
  const analysis = {
    round: roundResult.round,
    letter: roundResult.letter,
    submissions: formatRoundSubmissions(roundResult.results.submissions, players),
    scores: roundResult.results.scores,
    totalScores: roundResult.results.totalScores,
    categoryAnalysis: analyzeCategories(roundResult.results.submissions),
    topPerformers: getTopPerformers(roundResult.results.scores, players)
  };

  return {
    success: true,
    analysis: analysis
  };
}

/**
 * Analyze category performance
 * @param {Object} submissions - Submissions for the round
 * @returns {Object} Category analysis
 */
function analyzeCategories(submissions) {
  const categories = ['name', 'place', 'animal', 'thing'];
  const analysis = {};

  categories.forEach(category => {
    const answers = {};
    
    Object.keys(submissions).forEach(userId => {
      const answer = submissions[userId][category].toLowerCase();
      if (!answers[answer]) {
        answers[answer] = [];
      }
      answers[answer].push(userId);
    });

    analysis[category] = {
      uniqueAnswers: Object.keys(answers).length,
      duplicateAnswers: Object.keys(answers).filter(answer => answers[answer].length > 1).length,
      mostCommonAnswer: Object.keys(answers).reduce((a, b) => 
        answers[a].length > answers[b].length ? a : b, Object.keys(answers)[0] || ''),
      mostCommonCount: Object.keys(answers).length > 0 ? 
        Math.max(...Object.values(answers).map(arr => arr.length)) : 0
    };
  });

  return analysis;
}

/**
 * Get top performers for a round
 * @param {Object} scores - Scores for the round
 * @param {Array} players - Array of player objects
 * @returns {Array} Top performers sorted by score
 */
function getTopPerformers(scores, players) {
  return Object.keys(scores)
    .map(userId => ({
      userId,
      username: players.find(p => p.userId === userId)?.username || 'Unknown Player',
      score: scores[userId].total
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // Top 3 performers
}

module.exports = {
  getComprehensiveResults,
  getRoundAnalysis,
  formatLeaderboard,
  calculateGameStats
};
