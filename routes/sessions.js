// routes/sessions.js

const express = require("express");
const {
  listSessions,
  createSession,
  joinSession,
  leaveSession, // ← import it
  startSession,
} = require("../controllers/sessionController");
const router = express.Router();

router.get("/", listSessions);
router.post("/", createSession);
router.post("/:sessionId/join", joinSession);
router.post("/:sessionId/leave", leaveSession); // ← new route
router.post("/:sessionId/start", startSession);

module.exports = router;
