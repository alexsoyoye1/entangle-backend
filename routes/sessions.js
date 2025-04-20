// entangle-backend/routes/sessions.js
import express from "express";
import { listSessions } from "../controllers/sessionController.js";

const router = express.Router();
router.get("/", listSessions);
export default router;
