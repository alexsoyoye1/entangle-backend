// scripts/wipeUsers.js

/**
 * A utility to purge all game data for a list of user emails,
 * without touching their Auth account.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const emailsToWipe = [
  "alexsoyoye@live.com",
  // add more emails here…
];

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;
  return data.users.find((u) => u.email === email);
}

async function deleteGameData(userId) {
  // 1) Delete all intents where they are actor or target
  await supabase
    .from("intents")
    .delete()
    .or(`player_id.eq.${userId},target_id.eq.${userId}`);

  // 2) Remove them from any session_players
  await supabase.from("session_players").delete().eq("player_id", userId);

  // 3) If they hosted any sessions, delete those sessions and related data
  const { data: hostSessions, error: sessErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("host_id", userId);
  if (sessErr) throw sessErr;

  for (let s of hostSessions) {
    await supabase.from("intents").delete().eq("session_id", s.id);
    await supabase.from("session_players").delete().eq("session_id", s.id);
    await supabase.from("sessions").delete().eq("id", s.id);
  }

  // 4) Delete their profile row (if you want to treat them as a fresh user)
  await supabase.from("profiles").delete().eq("id", userId);

  console.log(`→ All game data wiped for user ${userId}`);
}

(async () => {
  for (let email of emailsToWipe) {
    console.log(`🗑  Wiping game data for ${email}…`);
    try {
      const user = await findUserByEmail(email);
      if (!user) {
        console.warn(`⚠️  No user found for ${email}`);
        continue;
      }
      await deleteGameData(user.id);
      console.log(`✅  Done wiping data for ${email}\n`);
    } catch (err) {
      console.error(`❌  Error wiping ${email}:`, err.message || err, "\n");
    }
  }
  console.log("All done.");
  process.exit();
})();
