// routes/game.js
// Defines in-game endpoints for Phase 1 (seating), Phase 2 (turn actions), and Phase 3 (final proposals).

const express = require("express");
const {
  getSeatingState,
  phase1PickSeat,
  getPhase2State,
  phase2Action,
  getPhase3State,
  phase3Proposal,
} = require("../controllers/gameController");

const router = express.Router();

// PHASE 1: seating
router.get("/:sessionId/seating", getSeatingState);
router.post("/:sessionId/seating/pick", phase1PickSeat);

// PHASE 2: turned picks & safety
router.get("/:sessionId/phase2", getPhase2State);
router.post("/:sessionId/phase2/action", phase2Action);

// PHASE 3: final choice proposals
router.get("/:sessionId/phase3", getPhase3State);
router.post("/:sessionId/phase3/propose", phase3Proposal);

module.exports = router;
