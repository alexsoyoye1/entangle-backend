// controllers/gameController.js
// Orchestrates HTTP requests during actual gameplay, delegating to gameService.

const gameService = require("../services/gameService");

// PHASE 1: Seating State
exports.getSeatingState = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const state = await gameService.getSeatingState(sessionId);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PHASE 1: Pick a seat
exports.phase1PickSeat = async (req, res) => {
  const { sessionId } = req.params;
  const { pickerId, targetId } = req.body;
  try {
    const result = await gameService.pickSeatPhase1(
      sessionId,
      pickerId,
      targetId
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PHASE 2: Turn state
exports.getPhase2State = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const state = await gameService.getPhase2State(sessionId);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PHASE 2: Perform action (pick or safety)
exports.phase2Action = async (req, res) => {
  const { sessionId } = req.params;
  const { playerId, action, targetId } = req.body;
  try {
    const outcome = await gameService.applyPhase2Action(
      sessionId,
      playerId,
      action,
      targetId
    );
    res.json(outcome);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PHASE 3: Final choice state
exports.getPhase3State = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const state = await gameService.getPhase3State(sessionId);
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PHASE 3: Make final proposal
exports.phase3Proposal = async (req, res) => {
  const { sessionId } = req.params;
  const { pickerId, targetId } = req.body;
  try {
    const result = await gameService.applyPhase3Proposal(
      sessionId,
      pickerId,
      targetId
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
