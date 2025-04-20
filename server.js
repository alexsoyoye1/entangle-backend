// server.js
// 1) Use node-fetch instead of Node18's undici‐based fetch (avoids WASM OOM)
const fetch = require("node-fetch");
global.fetch = fetch;

// 2) Load env (if you still use dotenv)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

// Init Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  console.log(`🚀 Entangle backend listening on port ${PORT}`);
});
