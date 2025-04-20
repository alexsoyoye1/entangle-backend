// entangle-backend/routes/queue.js
import express from "express";
import { enqueue } from "../controllers/queueController.js";

const router = express.Router();
router.post("/enqueue", enqueue);
export default router;
