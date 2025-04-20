// routes/intents.js

const express = require("express");
const { processIntents } = require("../controllers/intentController");
const router = express.Router();

// Clients POST here after writing their intent.
router.post("/process", processIntents);

module.exports = router;
