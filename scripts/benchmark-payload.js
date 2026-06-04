/**
 * Compare full gameState broadcast size vs delta payload size.
 * Run: node scripts/benchmark-payload.js
 */

const { serializeGameState } = require("../src/game/roomManager");

const sampleState = {
  roomId: "demo-room",
  status: "in-progress",
  round: 2,
  totalRounds: 3,
  currentLetter: "M",
  submissions: {
    u1: { name: "Mike", place: "Mumbai", animal: "Monkey", thing: "Map", submittedAt: 1 },
    u2: { name: "Mary", place: "Madrid", animal: "Moose", thing: "Mirror", submittedAt: 2 },
  },
  submittedPlayers: ["u1", "u2"],
  countdownActive: false,
  countdownEndsAt: null,
  roundResults: [{ round: 1, letter: "A", results: { submissions: {}, scores: {}, totalScores: {} } }],
  usedLetters: ["A", "M"],
  version: 12,
  lastEventId: 45,
  finalScores: null,
};

const full = JSON.stringify(serializeGameState(sampleState));
const delta = JSON.stringify({
  roomId: sampleState.roomId,
  eventId: sampleState.lastEventId,
  version: sampleState.version,
  delta: {
    round: sampleState.round,
    currentLetter: sampleState.currentLetter,
    submittedPlayers: sampleState.submittedPlayers,
    status: sampleState.status,
    version: sampleState.version,
  },
});

const fullBytes = Buffer.byteLength(full, "utf8");
const deltaBytes = Buffer.byteLength(delta, "utf8");
const reduction = Math.round((1 - deltaBytes / fullBytes) * 100);

console.log("NPAT payload benchmark (single sample state)");
console.log(`Full gameState: ${fullBytes} bytes`);
console.log(`Delta update:    ${deltaBytes} bytes`);
console.log(`Reduction:       ~${reduction}% smaller per high-frequency emit`);
