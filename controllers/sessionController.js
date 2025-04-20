// entangle-backend/controllers/sessionController.js
import { supabase } from "../services/supabaseClient.js";

export const listSessions = async (_req, res) => {
  const { data, error } = await supabase.from("sessions").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
