// controllers/queueController.js
const supabase = require("../services/supabaseClient");

exports.enqueue = async (req, res) => {
  const { userId, gender } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  // 1) Upsert into waiting queue
  const { error: upsertErr } = await supabase
    .from("waiting")
    .upsert([{ user_id: userId, gender }], { onConflict: "user_id" });
  if (upsertErr) return res.status(500).json({ error: upsertErr.message });

  // 2) Fetch all waiting users ordered by creation
  const { data: waiting, error: wErr } = await supabase
    .from("waiting")
    .select("*")
    .order("created_at", { ascending: true });
  if (wErr) return res.status(500).json({ error: wErr.message });

  let sessionId = null;

  // 3) If at least two waiting, pair them
  if (waiting.length >= 2) {
    const pair = waiting.slice(0, 2).map((w) => w.user_id);

    // Create a new session
    const { data: session, error: sErr } = await supabase
      .from("sessions")
      .insert([{ stage: "lobby" }])
      .select("id")
      .single();
    if (sErr) return res.status(500).json({ error: sErr.message });
    sessionId = session.id;

    // Insert into session_players
    const inserts = pair.map((uid, idx) => ({
      session_id: sessionId,
      player_id: uid,
      seat: idx + 1,
    }));
    const { error: spErr } = await supabase
      .from("session_players")
      .insert(inserts);
    if (spErr) return res.status(500).json({ error: spErr.message });

    // Clear waiting queue
    const { error: delErr } = await supabase.from("waiting").delete();
    if (delErr) return res.status(500).json({ error: delErr.message });
  }

  return res.json({ sessionId });
};
