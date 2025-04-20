// entangle-backend/server.js
import express from "express";
import cors from "cors";

import healthRoutes from "./routes/health.js";
import queueRoutes from "./routes/queue.js";
import sessionRoutes from "./routes/sessions.js";

const app = express();
app.use(cors());
app.use(express.json());

// mount routers
app.use("/", healthRoutes);
app.use("/queue", queueRoutes);
app.use("/sessions", sessionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Entangle backend listening on port ${PORT}`);
});
