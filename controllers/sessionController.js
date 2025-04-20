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

exports.startSession = async (req, res) => {
  const { sessionId } = req.params;
  // 1) Count players
  const { count, error: cntErr } = await supabase
    .from("session_players")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (cntErr) return res.status(500).json({ error: cntErr.message });

  const MIN_PLAYERS = 8;
  if ((count ?? 0) < MIN_PLAYERS) {
    return res
      .status(400)
      .json({ error: `Need at least ${MIN_PLAYERS} players` });
  }

  // 2) Advance stage -> in_game, set timer_expiry
  const TURN_DURATION = 60;
  const timerExpiry = new Date(Date.now() + TURN_DURATION * 1000).toISOString();

  const { error: updErr } = await supabase
    .from("sessions")
    .update({ stage: "in_game", timer_expiry: timerExpiry })
    .eq("id", sessionId);
  if (updErr) return res.status(500).json({ error: updErr.message });

  res.json({ sessionId });
};
