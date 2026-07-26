/**
 * Test Suite 10: Season Isolation
 * Ensures Season 1 and Season 2 data are completely isolated from each other.
 */
const assert = require('assert');

async function runTests() {
  console.log('🧪 Suite 10: Season Isolation');

  const Player = require('../models/Player');
  const MatchDay = require('../models/MatchDay');
  const { Match, RatingAwards } = require('../models/Match');
  const PlayerRatingSnapshot = require('../models/PlayerRatingSnapshot');

  // TC-10.1: Season 1 and Season 2 player IDs do not overlap
  const s1Ids = (await Player.findAll({ where: { SeasonId: 1 }, attributes: ['id'], raw: true })).map(p => p.id);
  const s2Ids = (await Player.findAll({ where: { SeasonId: 2 }, attributes: ['id'], raw: true })).map(p => p.id);
  const overlap = s1Ids.filter(id => s2Ids.includes(id));
  assert.strictEqual(overlap.length, 0,
    `S1 and S2 should have no overlapping player IDs, found ${overlap.length}`);
  console.log('  ✅ TC-10.1: No overlapping player IDs between seasons');

  // TC-10.2: Season 1 MatchDay IDs and Season 2 MatchDay IDs don't overlap
  const s1DayIds = (await MatchDay.findAll({ where: { SeasonId: 1 }, attributes: ['id'], raw: true })).map(d => d.id);
  const s2DayIds = (await MatchDay.findAll({ where: { SeasonId: 2 }, attributes: ['id'], raw: true })).map(d => d.id);
  const dayOverlap = s1DayIds.filter(id => s2DayIds.includes(id));
  assert.strictEqual(dayOverlap.length, 0,
    `S1 and S2 should have no overlapping MatchDay IDs, found ${dayOverlap.length}`);
  console.log('  ✅ TC-10.2: No overlapping MatchDay IDs between seasons');

  // TC-10.3: Season 2 matches only reference Season 2 player IDs
  const s2Matches = await Match.findAll({
    include: [{ model: MatchDay, where: { SeasonId: 2 } }],
    where: { matchCode: { [require('sequelize').Op.ne]: 'ABS' } }
  });
  const s2PlayerSet = new Set(s2Ids);
  for (const m of s2Matches) {
    const allTeamIds = [...(m.team1 || []), ...(m.team2 || [])];
    for (const pid of allTeamIds) {
      assert(s2PlayerSet.has(pid),
        `S2 Match ${m.id} references player ${pid} which is not in Season 2`);
    }
  }
  console.log(`  ✅ TC-10.3: All ${s2Matches.length} S2 matches reference only S2 players`);

  // TC-10.4: Season 1 RatingAwards only reference Season 1 players
  const s1MatchDayMatches = await Match.findAll({
    include: [{ model: MatchDay, where: { SeasonId: 1 } }]
  });
  const s1MatchIds = s1MatchDayMatches.map(m => m.id);
  if (s1MatchIds.length > 0) {
    const s1Awards = await RatingAwards.findAll({ where: { MatchId: s1MatchIds } });
    const s1PlayerSet = new Set(s1Ids);
    for (const a of s1Awards) {
      assert(s1PlayerSet.has(a.PlayerId),
        `S1 RatingAward MatchId=${a.MatchId} references PlayerId=${a.PlayerId} not in Season 1`);
    }
    console.log(`  ✅ TC-10.4: All ${s1Awards.length} S1 RatingAwards reference only S1 players`);
  } else {
    console.log('  ⏭️  TC-10.4: Skipped (no S1 matches)');
  }

  // TC-10.5: Rating snapshots for finalized S1 MatchDays reference only S1 players
  const s1Snapshots = await PlayerRatingSnapshot.findAll({
    include: [{ model: MatchDay, where: { SeasonId: 1 } }]
  });
  const s1PlayerSet = new Set(s1Ids);
  for (const snap of s1Snapshots) {
    assert(s1PlayerSet.has(snap.playerId),
      `S1 snapshot references playerId=${snap.playerId} not in Season 1`);
  }
  console.log(`  ✅ TC-10.5: All ${s1Snapshots.length} S1 snapshots reference only S1 players`);

  console.log('  🎉 Suite 10 Passed!\n');
}

if (require.main === module) {
  runTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = runTests;
