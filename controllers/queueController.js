// entangle-backend/controllers/queueController.js
import { supabase } from "../services/supabaseClient.js";

export const enqueue = async (req, res) => {
  const { userId, gender } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  // 1) Add to waiting queue if new
  await supabase.from("waiting").upsert({ user_id: userId, gender }).single();

  // 2) Fetch waiting list
  const { data: waiting, error: wErr } = await supabase
    .from("waiting")
    .select("*")
    .order("created_at");
  if (wErr) return res.status(500).json({ error: wErr.message });

  // 3) If 2+ waiting, pair & create session
  let sessionId = null;
  if (waiting.length >= 2) {
    const pair = waiting.slice(0, 2).map((w) => w.user_id);
    const { data: session, error: sErr } = await supabase
      .from("sessions")
      .insert([{ stage: "lobby" }])
      .select("id")
      .single();
    if (sErr) return res.status(500).json({ error: sErr.message });
    sessionId = session.id;

    // insert session_players
    await supabase.from("session_players").insert(
      pair.map((uid, idx) => ({
        session_id: sessionId,
        player_id: uid,
        seat: idx + 1,
      }))
    );

    // clear waiting table
    await supabase.from("waiting").delete();
  }

  return res.json({ sessionId });
};
