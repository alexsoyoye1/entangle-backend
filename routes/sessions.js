// routes/sessions.js
const express = require("express");
const { listSessions } = require("../controllers/sessionController");

const router = express.Router();
router.get("/", listSessions);

module.exports = router;
