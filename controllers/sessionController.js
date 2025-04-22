// controllers/sessionController.js

const supabase = require("../services/supabaseClient");
const TURN_DURATION = 60;

// List all sessions
exports.listSessions = async (_req, res) => {
  const { data, error } = await supabase.from("sessions").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// Create a new session: hostId + gameSize (5–9)
exports.createSession = async (req, res) => {
  const { hostId, gameSize } = req.body;
  if (!hostId || !gameSize) {
    return res
      .status(400)
      .json({ error: "hostId and gameSize (5–9) are required" });
  }
  if (gameSize < 5 || gameSize > 9) {
    return res.status(400).json({ error: "gameSize must be between 5 and 9" });
  }

  // 1) Lookup host gender
  const { data: hostProfile, error: profErr } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", hostId)
    .single();
  if (profErr) return res.status(500).json({ error: profErr.message });
  const hostGender = hostProfile.gender; // "male" or "female"

  // 2) Compute quotas
  //    host female → maxFemales = ceil(gameSize/2), maxMales = floor
  //    host male   → maxMales   = ceil(gameSize/2), maxFemales = floor
  const half = Math.floor(gameSize / 2);
  const ceilHalf = Math.ceil(gameSize / 2);
  const maxFemales = hostGender === "female" ? ceilHalf : gameSize - ceilHalf;
  const maxMales = gameSize - maxFemales;

  // 3) Create session row
  const now = new Date();
  const timerExpiry = new Date(
    now.getTime() + TURN_DURATION * 1000
  ).toISOString();
  const { data: session, error: sessErr } = await supabase
    .from("sessions")
    .insert({
      host_id: hostId,
      game_size: gameSize,
      max_females: maxFemales,
      max_males: maxMales,
      stage: "waiting",
      turn_index: 0,
      timer_expiry: timerExpiry,
      created_at: now.toISOString(),
    })
    .select("id")
    .single();
  if (sessErr) return res.status(500).json({ error: sessErr.message });

  const sessionId = session.id;

  // 4) Seat the host
  const { error: seatErr } = await supabase
    .from("session_players")
    .insert([{ session_id: sessionId, player_id: hostId, seat: 1 }]);
  if (seatErr) return res.status(500).json({ error: seatErr.message });

  res.status(201).json({ sessionId, maxFemales, maxMales });
};

// Start the game once enough have joined (min 5)
exports.startSession = async (req, res) => {
  const { sessionId } = req.params;

  const { count, error: cntErr } = await supabase
    .from("session_players")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);
  if (cntErr) return res.status(500).json({ error: cntErr.message });

  const MIN_PLAYERS = 5;
  if ((count ?? 0) < MIN_PLAYERS) {
    return res
      .status(400)
      .json({ error: `Need at least ${MIN_PLAYERS} players to start` });
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

  try {
    // 1) Fetch session quotas (game_size, max_females, max_males)
    const { data: session, error: sessErr } = await supabase
      .from("sessions")
      .select("game_size, max_females, max_males")
      .eq("id", sessionId)
      .single();
    if (sessErr) throw sessErr;

    // 2) Count & list existing players (we get both data & count)
    const {
      data: currentPlayers = [],
      count,
      error: curErr,
    } = await supabase
      .from("session_players")
      .select("player_id", { count: "exact" })
      .eq("session_id", sessionId);
    if (curErr) throw curErr;

    // 3) Is there still room?
    if ((count ?? 0) >= session.game_size) {
      return res.status(400).json({ error: "Session is full" });
    }

    // 4) Look up host gender
    const { data: hostSeat, error: hostErr } = await supabase
      .from("session_players")
      .select("player_id")
      .eq("session_id", sessionId)
      .eq("seat", 1)
      .single();
    if (hostErr) throw hostErr;
    const { data: hostProfile, error: profErr } = await supabase
      .from("profiles")
      .select("gender")
      .eq("id", hostSeat.player_id)
      .single();
    if (profErr) throw profErr;
    const hostGender = hostProfile.gender;

    // 5) Tally current gender counts
    const ids = currentPlayers.map((p) => p.player_id);
    let maleCount = 0,
      femaleCount = 0;
    if (ids.length) {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, gender")
        .in("id", ids);
      if (pErr) throw pErr;
      profiles.forEach((p) => {
        if (p.gender === "male") maleCount++;
        else if (p.gender === "female") femaleCount++;
      });
    }

    // 6) Fetch joiner’s gender
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("gender")
      .eq("id", userId)
      .single();
    if (meErr) throw meErr;
    const myGender = me.gender;

    // 7) Enforce host‑based quotas
    if (myGender === "female" && femaleCount >= session.max_females) {
      return res.status(400).json({ error: "Max number of females reached" });
    }
    if (myGender === "male" && maleCount >= session.max_males) {
      return res.status(400).json({ error: "Max number of males reached" });
    }

    // 8) Seat the player
    const nextSeat = (count ?? 0) + 1;
    const { error: joinErr } = await supabase
      .from("session_players")
      .insert([{ session_id: sessionId, player_id: userId, seat: nextSeat }]);
    if (joinErr) throw joinErr;

    res.json({ sessionId, seat: nextSeat });
  } catch (err) {
    console.error("joinSession error:", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
};

// Leave session
exports.leaveSession = async (req, res) => {
  const { sessionId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  await supabase
    .from("session_players")
    .delete()
    .match({ session_id: sessionId, player_id: userId });

  // If room now empty, delete everything
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

// End session (host only)
exports.endSession = async (req, res) => {
  const { sessionId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  // Verify host
  const { data: hostRow, error: hostErr } = await supabase
    .from("session_players")
    .select("player_id")
    .eq("session_id", sessionId)
    .eq("seat", 1)
    .single();
  if (hostErr) return res.status(500).json({ error: hostErr.message });
  if (hostRow.player_id !== userId) {
    return res
      .status(403)
      .json({ error: "Only the host may end this session." });
  }

  // Wipe out all game data
  await supabase.from("intents").delete().eq("session_id", sessionId);
  await supabase.from("session_players").delete().eq("session_id", sessionId);
  const { error: delErr } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);
  if (delErr) return res.status(500).json({ error: delErr.message });

  res.json({ success: true });
};
