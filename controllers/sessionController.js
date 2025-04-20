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

  // Note: use 'waiting' here so your Flutter lobby (which filters on stage='waiting')
  // will pick up newly created rooms.
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      stage: "waiting",
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

  // 2) Advance stage -> in_game, set new timer_expiry
  const newExpiry = new Date(Date.now() + TURN_DURATION * 1000).toISOString();

  const { error: updErr } = await supabase
    .from("sessions")
    .update({ stage: "in_game", timer_expiry: newExpiry })
    .eq("id", sessionId);
  if (updErr) return res.status(500).json({ error: updErr.message });

  res.json({ sessionId });
};

exports.joinSession = async (req, res) => {
  const { sessionId } = req.params;
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  // figure out next seat number
  const { count, error: cntErr } = await supabase
    .from("session_players")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (cntErr) {
    console.error("Error counting players:", cntErr);
    return res.status(500).json({ error: cntErr.message });
  }
  const seat = (count ?? 0) + 1;

  // insert into session_players
  const { error: joinErr } = await supabase
    .from("session_players")
    .insert([{ session_id: sessionId, player_id: userId, seat }]);
  if (joinErr) {
    console.error("Error joining session:", joinErr);
    return res.status(500).json({ error: joinErr.message });
  }

  res.json({ sessionId, seat });
};
exports.leaveSession = async (req, res) => {
  const { sessionId } = req.params;
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  // 1) Remove the player from session_players
  const { error: delErr } = await supabase
    .from("session_players")
    .delete()
    .match({ session_id: sessionId, player_id: userId });
  if (delErr) {
    console.error("Error leaving session:", delErr);
    return res.status(500).json({ error: delErr.message });
  }

  // 2) If no one remains in the session, clean up the session and related intents
  const { count, error: cntErr } = await supabase
    .from("session_players")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (cntErr) {
    console.error("Error counting remaining players:", cntErr);
    // not fatal—just warn
  } else if ((count ?? 0) === 0) {
    await supabase.from("intents").delete().eq("session_id", sessionId);
    await supabase.from("sessions").delete().eq("id", sessionId);
  }

  res.json({ sessionId });
};
