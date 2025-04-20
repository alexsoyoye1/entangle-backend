// controllers/sessionController.js
const supabase = require("../services/supabaseClient");
const TURN_DURATION = 60;

exports.listSessions = async (_req, res) => {
  const { data, error } = await supabase.from("sessions").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

exports.createSession = async (req, res) => {
  const now = new Date();
  const timerExpiry = new Date(
    now.getTime() + TURN_DURATION * 1000
  ).toISOString();

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
    console.error("Error creating session:", error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json({ sessionId: data.id });
};
