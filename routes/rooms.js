// routes/rooms.js
const express = require("express");
const router = express.Router();

// Supabase client instance (imported from your server.js or a shared module)
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// How long each turn should last, in seconds
const TURN_DURATION = 60;

router.post("/create", async (req, res) => {
  try {
    // You could allow flags here (e.g. private rooms) via req.body
    const now = new Date();
    const timerExpiry = new Date(
      now.getTime() + TURN_DURATION * 1000
    ).toISOString();

    // Insert a new session row
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        stage: "lobby",
        turn_index: 0,
        timer_expiry: timerExpiry,
        created_at: now.toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating room:", error);
      return res.status(500).json({ error: error.message });
    }

    // Return the new session ID
    return res.json({ sessionId: data.id });
  } catch (err) {
    console.error("Unexpected error in /rooms/create:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
