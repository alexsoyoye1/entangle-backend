// services/gameService.js
// Pure game logic and DB interaction for seating, turns, conflicts, eliminations, and final proposals.

const supabase = require("../services/supabaseClient");

/**
 * PHASE 1: Fetch current seating and pool state
 */
async function getSeatingState(sessionId) {
  // TODO: query session_players and profiles, and list both seated and pool players
  throw new Error("Not implemented");
}

/**
 * PHASE 1: Assign next seat for a picker → target
 */
async function pickSeatPhase1(sessionId, pickerId, targetId) {
  // TODO: enforce alternating gender, assign seat, record picks
  throw new Error("Not implemented");
}

/**
 * PHASE 2: Return turn index, expiry, active players, and who has safety remaining
 */
async function getPhase2State(sessionId) {
  // TODO: read sessions.turn_index, sessions.timer_expiry, session_players
  throw new Error("Not implemented");
}

/**
 * PHASE 2: Apply a pick or safety action
 */
async function applyPhase2Action(sessionId, playerId, action, targetId) {
  // TODO: validate action, handle conflicts, eliminations, advance turn
  throw new Error("Not implemented");
}

/**
 * PHASE 3: Determine which gender is solo and list valid targets
 */
async function getPhase3State(sessionId) {
  // TODO: tally active seats by gender; return pickerId + targets[]
  throw new Error("Not implemented");
}

/**
 * PHASE 3: Process final proposal acceptance or rejection
 */
async function applyPhase3Proposal(sessionId, pickerId, targetId) {
  // TODO: if accepted → record final pair, end game; if rejected → eliminate picker
  throw new Error("Not implemented");
}

module.exports = {
  getSeatingState,
  pickSeatPhase1,
  getPhase2State,
  applyPhase2Action,
  getPhase3State,
  applyPhase3Proposal,
};
