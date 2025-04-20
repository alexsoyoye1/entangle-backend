// controllers/intentController.js
const supabase = require("../services/supabaseClient");

/**
 * POST /intents/process
 * Body: { sessionId: string }
 *
 * 1. Fetch all intents for this session.
 * 2. Apply your turn‑engine rules.
 * 3. Update the sessions table: increment turn_index, bump timer_expiry, possibly change stage.
 * 4. Clear out processed intents (so next turn starts fresh).
 */
exports.processIntents = async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  // 1) Load session row
  const { data: sessions, error: sessErr } = await supabase
    .from("sessions")
    .select("turn_index, stage")
    .eq("id", sessionId)
    .single();
  if (sessErr) {
    console.error("Error fetching session:", sessErr);
    return res.status(500).json({ error: sessErr.message });
  }

  const currentTurn = sessions.turn_index;
  const stage = sessions.stage;

  // 2) Fetch all intents for this session
  const { data: intents, error: intErr } = await supabase
    .from("intents")
    .select("player_id, action, target_id")
    .eq("session_id", sessionId);
  if (intErr) {
    console.error("Error fetching intents:", intErr);
    return res.status(500).json({ error: intErr.message });
  }

  // 3) Apply your turn‑engine logic (simple example):
  //    If ANY player chose 'safety', we skip picks.
  //    Otherwise, we could pair off the first 'pick' intent.
  let nextStage = stage;
  let outcomeInfo = null;

  const safetyIntents = intents.filter((i) => i.action === "safety");
  if (safetyIntents.length > 0) {
    outcomeInfo = { skipped: true, by: safetyIntents.map((i) => i.player_id) };
  } else {
    const pickIntents = intents.filter((i) => i.action === "pick");
    if (pickIntents.length > 0) {
      const firstPick = pickIntents[0];
      outcomeInfo = {
        pair: [firstPick.player_id, firstPick.target_id],
      };
    } else {
      // no intents → do nothing special
      outcomeInfo = { none: true };
    }
  }

  // 4) Compute new turn_index and timer_expiry
  const TURN_DURATION = 60; // seconds
  const newTurnIndex = currentTurn + 1;
  const newTimerExpiry = new Date(
    Date.now() + TURN_DURATION * 1000
  ).toISOString();

  // 5) Update session row
  const { error: updErr } = await supabase
    .from("sessions")
    .update({
      turn_index: newTurnIndex,
      timer_expiry: newTimerExpiry,
      // optionally: stage: 'in_game' or advance to 'final_choice' when players <=2
    })
    .eq("id", sessionId);
  if (updErr) {
    console.error("Error updating session:", updErr);
    return res.status(500).json({ error: updErr.message });
  }

  // 6) Delete processed intents so next turn is clean
  const { error: delErr } = await supabase
    .from("intents")
    .delete()
    .eq("session_id", sessionId);
  if (delErr) {
    console.error("Error deleting intents:", delErr);
    // not fatal—just warn
  }

  // 7) Return the new session state + outcome
  return res.json({
    turnIndex: newTurnIndex,
    timerExpiry: newTimerExpiry,
    outcome: outcomeInfo,
  });
};
