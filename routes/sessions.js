// routes/sessions.js
const express = require("express");
const {
  listSessions,
  createSession,
  startSession,
} = require("../controllers/sessionController");
const router = express.Router();

// GET  /sessions       → list all sessions
router.get("/", listSessions);

// POST /sessions      → create a new lobby session
router.post("/", createSession);

router.post("/:sessionId/start", startSession);

module.exports = router;
