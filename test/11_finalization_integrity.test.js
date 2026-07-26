/**
 * Test Suite 11: Finalization Integrity
 * Validates that match finalization applied ratings and snapshots correctly.
 */
const assert = require('assert');

async function runTests() {
  console.log('🧪 Suite 11: Finalization Integrity');

  const MatchDay = require('../models/MatchDay');
  const { Match, RatingAwards } = require('../models/Match');
  const Player = require('../models/Player');
  const PlayerRatingSnapshot = require('../models/PlayerRatingSnapshot');
  const Attendance = require('../models/Attendance');
  const { Op } = require('sequelize');

  // TC-11.1: Every finalized MatchDay is marked finalized=true
  const finalizedDays = await MatchDay.findAll({ where: { finalized: true } });
  assert(finalizedDays.length > 0, 'There should be at least 1 finalized MatchDay');
  console.log(`  ✅ TC-11.1: ${finalizedDays.length} finalized MatchDays found`);

  // TC-11.2: Every finalized MatchDay has player rating snapshots
  for (const day of finalizedDays) {
    const snapCount = await PlayerRatingSnapshot.count({ where: { matchDayId: day.id } });
    assert(snapCount > 0,
      `Finalized MatchDay ${day.date} should have snapshots, got ${snapCount}`);
  }
  console.log('  ✅ TC-11.2: All finalized MatchDays have player rating snapshots');

  // TC-11.3: Finalized matches should have winnerIds and loserIds (track exceptions)
  let matchesWithResults = 0;
  let matchesWithScore = 0;
  let matchesWithoutResults = 0;
  for (const day of finalizedDays) {
    const matches = await Match.findAll({
      where: { MatchDayId: day.id, matchCode: { [Op.ne]: 'ABS' } }
    });
    for (const m of matches) {
      if (m.winnerIds && m.winnerIds.length > 0) {
        matchesWithResults++;
        if (m.score) matchesWithScore++;
      } else {
        matchesWithoutResults++;
      }
    }
  }
  // Most matches should have results; a few legacy exceptions are tolerable
  assert(matchesWithResults > matchesWithoutResults * 10,
    `Too many matches without results: ${matchesWithoutResults} without vs ${matchesWithResults} with`);
  console.log(`  ✅ TC-11.3: ${matchesWithResults} matches with results (${matchesWithScore} with score), ${matchesWithoutResults} legacy exceptions`);

  // TC-11.4: Every absent player in a finalized MatchDay has an ABS match with -10 penalty
  for (const day of finalizedDays) {
    const absentees = await Attendance.findAll({
      where: { MatchDayId: day.id, present: false }
    });
    if (absentees.length === 0) continue;

    const absMatch = await Match.findOne({
      where: { MatchDayId: day.id, matchCode: 'ABS' }
    });
    assert(absMatch, `Finalized MatchDay ${day.date} with absentees should have ABS match`);

    for (const att of absentees) {
      const penalty = await RatingAwards.findOne({
        where: { MatchId: absMatch.id, PlayerId: att.PlayerId }
      });
      assert(penalty, `Absent player ${att.PlayerId} on ${day.date} should have ABS RatingAward`);
      assert.strictEqual(penalty.Rating, -10,
        `ABS penalty for player ${att.PlayerId} should be -10, got ${penalty.Rating}`);
    }
  }
  console.log('  ✅ TC-11.4: All absent players in finalized MatchDays have -10 ABS penalty');

  // TC-11.5: Non-zero RatingAwards for matches WITH results in finalized MatchDays
  let zeroAwardCount = 0;
  for (const day of finalizedDays) {
    const matches = await Match.findAll({
      where: { MatchDayId: day.id, matchCode: { [Op.ne]: 'ABS' } }
    });
    // Only check matches that actually have results entered
    const matchesWithWinners = matches.filter(m => m.winnerIds && m.winnerIds.length > 0);
    const matchIds = matchesWithWinners.map(m => m.id);
    if (matchIds.length === 0) continue;
    const awards = await RatingAwards.findAll({ where: { MatchId: matchIds } });
    const zeroAwards = awards.filter(a => a.Rating === 0);
    zeroAwardCount += zeroAwards.length;
  }
  assert.strictEqual(zeroAwardCount, 0,
    `${zeroAwardCount} RatingAwards still at 0 for matches with results`);
  console.log('  ✅ TC-11.5: No zero-rated RatingAwards in finalized matches with results');

  // TC-11.6: Snapshot rating for each player matches their currentRating at time of snapshot
  // (Check latest finalized matchday)
  const latestFinalized = finalizedDays.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  if (latestFinalized) {
    const snaps = await PlayerRatingSnapshot.findAll({ where: { matchDayId: latestFinalized.id } });
    for (const snap of snaps) {
      const player = await Player.findByPk(snap.playerId);
      if (!player) continue;
      assert.strictEqual(snap.rating, player.currentRating,
        `Snapshot for ${player.name} on ${latestFinalized.date}: snapshot.rating (${snap.rating}) != player.currentRating (${player.currentRating})`);
    }
    console.log(`  ✅ TC-11.6: Latest snapshot ratings match player currentRatings for ${snaps.length} players`);
  }

  // TC-11.7: Every player that participated in a finalized day has lastRatingUpdatedOn set
  const allPlayedIds = new Set();
  for (const day of finalizedDays) {
    const matches = await Match.findAll({ where: { MatchDayId: day.id, matchCode: { [Op.ne]: 'ABS' } } });
    for (const m of matches) {
      [...(m.team1 || []), ...(m.team2 || [])].forEach(id => allPlayedIds.add(id));
    }
  }
  let missingTimestamp = 0;
  for (const pid of allPlayedIds) {
    const player = await Player.findByPk(pid);
    if (player && !player.lastRatingUpdatedOn) missingTimestamp++;
  }
  assert.strictEqual(missingTimestamp, 0,
    `${missingTimestamp} players who played in finalized matches have null lastRatingUpdatedOn`);
  console.log(`  ✅ TC-11.7: All ${allPlayedIds.size} players with finalized matches have lastRatingUpdatedOn set`);

  console.log('  🎉 Suite 11 Passed!\n');
}

if (require.main === module) {
  runTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = runTests;
