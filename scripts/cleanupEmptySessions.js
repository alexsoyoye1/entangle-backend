// scripts/cleanupEmptySessions.js

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase with the service-role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Deletes any sessions older than 2 minutes that have no players.
 */
async function cleanupEmptySessions() {
  try {
    // 1) Find sessions older than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: oldSessions, error: fetchErr } = await supabase
      .from("sessions")
      .select("id")
      .lt("created_at", twoMinutesAgo);

    if (fetchErr) throw fetchErr;
    if (!oldSessions || oldSessions.length === 0) {
      console.log("No old sessions found.");
      return;
    }

    // 2) For each, check if there are any players
    const emptyIds = [];
    for (const { id } of oldSessions) {
      const { count, error: cntErr } = await supabase
        .from("session_players")
        .select("*", { count: "exact", head: true })
        .eq("session_id", id);

      if (cntErr) {
        console.error(`Error counting players in session ${id}:`, cntErr);
        continue;
      }
      if ((count || 0) === 0) emptyIds.push(id);
    }

    if (emptyIds.length === 0) {
      console.log("No empty sessions to delete.");
      return;
    }

    // 3) Delete all those sessions
    const { error: delErr } = await supabase
      .from("sessions")
      .delete()
      .in("id", emptyIds);

    if (delErr) throw delErr;
    console.log(`Deleted ${emptyIds.length} empty sessions:`, emptyIds);
  } catch (err) {
    console.error("cleanupEmptySessions error:", err);
    process.exit(1);
  }
}

// If run directly, execute cleanup
if (require.main === module) {
  cleanupEmptySessions().then(() => process.exit(0));
}

module.exports = { cleanupEmptySessions };
