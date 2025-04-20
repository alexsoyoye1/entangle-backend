// entangle-backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const queueRoutes = require("./routes/queue");
const sessionRoutes = require("./routes/sessions");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", healthRoutes);
app.use("/queue", queueRoutes);
app.use("/sessions", sessionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Listening on port ${PORT}`);
});
