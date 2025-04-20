// routes/queue.js
const express = require("express");
const { enqueue } = require("../controllers/queueController");

const router = express.Router();
router.post("/enqueue", enqueue);

module.exports = router;
