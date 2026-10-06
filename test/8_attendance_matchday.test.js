/**
 * Test Suite 8: Attendance & MatchDay Integrity
 * Validates attendance data, MatchDay finalization, and player-match linkage.
 */
const assert = require('assert');

async function runTests() {
  console.log('🧪 Suite 8: Attendance & MatchDay Integrity');

  const MatchDay = require('../models/MatchDay');
  const { Match, RatingAwards } = require('../models/Match');
  const Attendance = require('../models/Attendance');
  const Player = require('../models/Player');

  // TC-8.1: Every finalized MatchDay has at least 1 match
  const finalizedDays = await MatchDay.findAll({ where: { finalized: true } });
  for (const day of finalizedDays) {
    const matchCount = await Match.count({ where: { MatchDayId: day.id } });
    assert(matchCount > 0,
      `Finalized MatchDay ${day.id} (${day.date}) should have matches, got ${matchCount}`);
  }
  console.log(`  ✅ TC-8.1: All ${finalizedDays.length} finalized MatchDays have matches`);

  // TC-8.2: Every finalized MatchDay with attendance has records for present/absent players
  for (const day of finalizedDays) {
    const attRecords = await Attendance.count({ where: { MatchDayId: day.id } });
    if (attRecords > 0) {
      assert(attRecords >= 10,
        `MatchDay ${day.date} attendance should have >=10 records, got ${attRecords}`);
    }
  }
  console.log('  ✅ TC-8.2: Finalized MatchDays with attendance have reasonable record counts');

  // TC-8.3: Each finalized match with awards has exactly 2 or 4 players in RatingAwards (singles=2, doubles=4, ABS=variable)
  const regularMatches = await Match.findAll({
    where: { matchCode: ['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12'] }
  });
  let teamSizeErrors = 0;
  let matchesChecked = 0;
  for (const m of regularMatches) {
    const awardCount = await RatingAwards.count({ where: { MatchId: m.id } });
    if (awardCount > 0) {
      matchesChecked++;
      const expectedCount = m.matchType === 'singles' ? 2 : 4;
      if (awardCount !== expectedCount) {
        teamSizeErrors++;
      }
    }
  }
  assert.strictEqual(teamSizeErrors, 0,
    `${teamSizeErrors} matches have incorrect number of RatingAward entries`);
  console.log(`  ✅ TC-8.3: All ${matchesChecked} awarded regular matches have correct team sizes (2 for singles, 4 for doubles)`);

  // TC-8.4: team1 and team2 arrays in each match contain valid player IDs
  const allMatches = await Match.findAll({
    where: { matchCode: { [require('sequelize').Op.ne]: 'ABS' } }
  });
  let invalidTeamRefs = 0;
  for (const m of allMatches) {
    const allIds = [...(m.team1 || []), ...(m.team2 || [])];
    for (const pid of allIds) {
      const exists = await Player.findByPk(pid);
      if (!exists) invalidTeamRefs++;
    }
  }
  assert.strictEqual(invalidTeamRefs, 0,
    `${invalidTeamRefs} match team references point to non-existent players`);
  console.log(`  ✅ TC-8.4: All match team references point to valid players`);

  // TC-8.5: No team1/team2 overlap (a player can't be on both teams)
  let overlapErrors = 0;
  for (const m of allMatches) {
    const t1 = m.team1 || [];
    const t2 = m.team2 || [];
    const overlap = t1.filter(id => t2.includes(id));
    if (overlap.length > 0) overlapErrors++;
  }
  assert.strictEqual(overlapErrors, 0, `${overlapErrors} matches have team overlap`);
  console.log('  ✅ TC-8.5: No matches have overlapping team1/team2 players');

  // TC-8.6: Each full court group has 12 matches (M1-M12); partial courts have fewer
  const matchDaysWithMatches = await MatchDay.findAll({ where: { finalized: true } });
  let fullCourts = 0;
  let partialCourts = 0;
  for (const day of matchDaysWithMatches) {
    const matches = await Match.findAll({
      where: { MatchDayId: day.id, matchCode: { [require('sequelize').Op.ne]: 'ABS' } }
    });
    if (matches.length === 0) continue;
    const courts = {};
    matches.forEach(m => { if (m.court) courts[m.court] = (courts[m.court] || 0) + 1; });
    for (const [court, count] of Object.entries(courts)) {
      if (count === 12) {
        fullCourts++;
      } else {
        // Partial or extended courts (admin may manually add/remove matches)
        assert(count >= 1 && count <= 20,
          `MatchDay ${day.date} Court ${court} should have 1-20 matches, got ${count}`);
        partialCourts++;
      }
    }
  }
  console.log(`  ✅ TC-8.6: ${fullCourts} full courts (12 matches), ${partialCourts} partial courts verified`);

  console.log('  🎉 Suite 8 Passed!\n');
}

if (require.main === module) {
  runTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = runTests;
