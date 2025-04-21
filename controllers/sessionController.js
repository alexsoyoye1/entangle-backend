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
      stage: "waiting",
      turn_index: 0,
      timer_expiry: timerExpiry,
      created_at: now.toISOString(),
    })
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ sessionId: data.id });
};

exports.startSession = async (req, res) => {
  const { sessionId } = req.params;
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
  if (!userId) return res.status(400).json({ error: "userId is required" });

  // ✅ Check if user already in session
  const { data: existing } = await supabase
    .from("session_players")
    .select("id")
    .eq("session_id", sessionId)
    .eq("player_id", userId)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ error: "User already in session" });
  }

  // ✅ Fetch existing players with gender
  const { data: players, error: playersErr } = await supabase
    .from("session_players")
    .select("seat, player_id, profiles!inner(gender)")
    .eq("session_id", sessionId)
    .order("seat", { ascending: true });

  if (playersErr) return res.status(500).json({ error: playersErr.message });

  const nextSeat = (players?.length ?? 0) + 1;

  // ✅ Fetch joining user's gender
  const { data: userProfile, error: userErr } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", userId)
    .single();

  if (userErr) return res.status(500).json({ error: userErr.message });
  if (!userProfile) return res.status(400).json({ error: "Profile not found" });

  // ✅ Only enforce gender alternation from seat 2 onward
  if (nextSeat > 1) {
    const hostGender = players[0]?.profiles?.gender;
    if (!hostGender) {
      return res.status(400).json({ error: "Host gender is undefined" });
    }

    const expectedGender =
      nextSeat % 2 === 1
        ? hostGender
        : hostGender === "male"
        ? "female"
        : "male";

    if (userProfile.gender !== expectedGender) {
      return res.status(400).json({
        error: `Seat ${nextSeat} requires a ${expectedGender} player`,
      });
    }
  }

  // ✅ Insert user into session_players
  const { error: joinErr } = await supabase
    .from("session_players")
    .insert([{ session_id: sessionId, player_id: userId, seat: nextSeat }]);

  if (joinErr) return res.status(500).json({ error: joinErr.message });

  res.json({ sessionId, seat: nextSeat });
};

exports.leaveSession = async (req, res) => {
  const { sessionId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  await supabase
    .from("session_players")
    .delete()
    .match({ session_id: sessionId, player_id: userId });

  const { count } = await supabase
    .from("session_players")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if ((count ?? 0) === 0) {
    await supabase.from("intents").delete().eq("session_id", sessionId);
    await supabase.from("sessions").delete().eq("id", sessionId);
  }

  res.json({ sessionId });
};

exports.endSession = async (req, res) => {
  const { sessionId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const { data: hostRow, error: hostErr } = await supabase
    .from("session_players")
    .select("player_id")
    .eq("session_id", sessionId)
    .eq("seat", 1)
    .single();

  if (hostErr) return res.status(500).json({ error: hostErr.message });
  if (!hostRow || hostRow.player_id !== userId) {
    return res.status(403).json({ error: "Only the session host may end it." });
  }

  await supabase.from("intents").delete().eq("session_id", sessionId);
  await supabase.from("session_players").delete().eq("session_id", sessionId);

  const { error: delSessionErr } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (delSessionErr)
    return res.status(500).json({ error: delSessionErr.message });
  res.json({ success: true });
};
