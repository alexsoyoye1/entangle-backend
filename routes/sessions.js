// routes/sessions.js

const express = require("express");
const {
  listSessions,
  createSession,
  joinSession,
  leaveSession, // ← import it
  startSession,
  endSession,
} = require("../controllers/sessionController");
const router = express.Router();

router.get("/", listSessions);
router.post("/", createSession);
router.post("/:sessionId/join", joinSession);
router.post("/:sessionId/leave", leaveSession);
router.post("/:sessionId/start", startSession);
router.post("/:sessionId/end", endSession);

module.exports = router;
