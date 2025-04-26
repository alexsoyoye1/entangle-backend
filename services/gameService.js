// services/gameService.js
// Pure game logic and DB interaction for seating, turns, conflicts, eliminations, and final proposals.

const supabase = require("../services/supabaseClient");
/**
 * PHASE 1: Fetch current seating and pool state
 *
 * Returns:
 *   {
 *     seated: [ { playerId, username, avatar_url, gender, seat }… ],
 *     pool:   [ { playerId, username, avatar_url, gender }… ],
 *     nextSeat: number
 *   }
 */
async function getSeatingState(sessionId) {
  // 1) Pull everybody in this session plus their profile
  const { data: rows, error } = await supabase
    .from("session_players")
    .select(
      `
        player_id,
        seat,
        last_picked_by,
        last_picked_target,
        profiles!fk_sp_profiles(
          username,
          avatar_url,
          gender
        )
      `
    )
    .eq("session_id", sessionId);
  if (error) throw error;

  // 2) Partition into “seated” (seat > 0) vs “pool” (seat IS NULL)
  const seated = [];
  const pool = [];
  for (const r of rows) {
    const p = {
      playerId: r.player_id,
      username: r.profiles.username,
      avatar_url: r.profiles.avatar_url,
      gender: r.profiles.gender,
      seat: r.seat,
      lastPickedBy: r.last_picked_by,
      lastPickedTarget: r.last_picked_target,
    };
    if (r.seat != null) seated.push(p);
    else pool.push(p);
  }

  // 3) Sort the seated by seat number ascending
  seated.sort((a, b) => a.seat - b.seat);

  return {
    seated,
    pool,
    nextSeat: seated.length + 1,
  };
}

/**
 * PHASE 1: Seat the `targetId` at the next open seat, record the pick,
 * enforce alternating-gender & turn order.
 *
 * Returns the updated seating state (same shape as getSeatingState).
 */
async function pickSeatPhase1(sessionId, pickerId, targetId) {
  // 1) Load current seating
  const { seated, pool, nextSeat } = await getSeatingState(sessionId);

  // 2) Validate it’s picker’s turn: must be last in seated
  if (seated.length === 0 || seated[seated.length - 1].playerId !== pickerId) {
    throw new Error("Not your turn to seat.");
  }

  // 3) Make sure target is still in the pool
  if (!pool.find((p) => p.playerId === targetId)) {
    throw new Error("That player is not available to seat.");
  }

  // 4) Enforce alternating gender
  const lastPickerGender = seated[seated.length - 1].gender;
  const expectedGender = lastPickerGender === "male" ? "female" : "male";
  const targetProfile = pool.find((p) => p.playerId === targetId);
  if (targetProfile.gender !== expectedGender) {
    throw new Error(`You must seat a ${expectedGender} next.`);
  }

  // 5) Perform the seat assignment & record pick metadata
  const updates = [
    // set the new seat for the target
    supabase
      .from("session_players")
      .update({
        seat: nextSeat,
        last_picked_by: pickerId,
      })
      .match({ session_id: sessionId, player_id: targetId }),

    // record on the picker who they just picked
    supabase
      .from("session_players")
      .update({
        last_picked_target: targetId,
      })
      .match({ session_id: sessionId, player_id: pickerId }),
  ];
  const [{ error: err1 }, { error: err2 }] = await Promise.all(updates);
  if (err1 || err2) {
    throw err1 || err2;
  }

  // 6) If no one left in pool → seating is done
  if (pool.length === 1) {
    //  • enable safety for everyone
    await supabase
      .from("session_players")
      .update({ has_safety: true })
      .eq("session_id", sessionId);

    //  • bump session.stage → in_game
    await supabase
      .from("sessions")
      .update({ stage: "in_game", turn_index: 0 })
      .eq("id", sessionId);
  }

  // 7) Return the new seating state
  return getSeatingState(sessionId);
}

/**
 * PHASE 2: Return turn index, expiry, active players, and who has safety remaining
 */
async function getPhase2State(sessionId) {
  // TODO: read sessions.turn_index, sessions.timer_expiry, session_players
  throw new Error("Not implemented");
}

/**
 * PHASE 2: Apply a pick or safety action
 */
async function applyPhase2Action(sessionId, playerId, action, targetId) {
  // TODO: validate action, handle conflicts, eliminations, advance turn
  throw new Error("Not implemented");
}

/**
 * PHASE 3: Determine which gender is solo and list valid targets
 */
async function getPhase3State(sessionId) {
  // TODO: tally active seats by gender; return pickerId + targets[]
  throw new Error("Not implemented");
}

/**
 * PHASE 3: Process final proposal acceptance or rejection
 */
async function applyPhase3Proposal(sessionId, pickerId, targetId) {
  // TODO: if accepted → record final pair, end game; if rejected → eliminate picker
  throw new Error("Not implemented");
}

module.exports = {
  getSeatingState,
  pickSeatPhase1,
  getPhase2State,
  applyPhase2Action,
  getPhase3State,
  applyPhase3Proposal,
};
