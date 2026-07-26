/**
 * Test Suite 5: Season & Structure Integrity
 * Validates that the multi-season architecture is correctly set up.
 */
const assert = require('assert');

async function runTests() {
  console.log('🧪 Suite 5: Season & Structure Integrity');

  const Season = require('../models/Season');
  const MatchDay = require('../models/MatchDay');
  const Player = require('../models/Player');

  // TC-5.1: Both seasons exist with correct metadata
  const s1 = await Season.findByPk(1);
  const s2 = await Season.findByPk(2);
  assert(s1, 'Season 1 must exist');
  assert(s2, 'Season 2 must exist');
  assert.strictEqual(s1.isActive, false, 'Season 1 should be inactive');
  assert.strictEqual(s2.isActive, true, 'Season 2 should be active');
  console.log('  ✅ TC-5.1: Both seasons exist with correct active flags');

  // TC-5.2: Season 2 start date is 2026-07-12
  assert.strictEqual(s2.startDate, '2026-07-12', 'Season 2 startDate must be 2026-07-12');
  console.log('  ✅ TC-5.2: Season 2 start date is 2026-07-12');

  // TC-5.3: Every MatchDay has a valid SeasonId (no nulls)
  const nullSeasonDays = await MatchDay.count({ where: { SeasonId: null } });
  assert.strictEqual(nullSeasonDays, 0, 'No MatchDay should have null SeasonId');
  console.log('  ✅ TC-5.3: All MatchDays have a SeasonId assigned');

  // TC-5.4: Every Player has a valid SeasonId (no nulls)
  const nullSeasonPlayers = await Player.count({ where: { SeasonId: null } });
  assert.strictEqual(nullSeasonPlayers, 0, 'No Player should have null SeasonId');
  console.log('  ✅ TC-5.4: All Players have a SeasonId assigned');

  // TC-5.5: Season 1 has historical match days (>=7)
  const s1Days = await MatchDay.count({ where: { SeasonId: 1 } });
  assert(s1Days >= 7, `Season 1 should have >= 7 match days, got ${s1Days}`);
  console.log(`  ✅ TC-5.5: Season 1 has ${s1Days} historical match days`);

  // TC-5.6: Season 2 has at least 1 match day (12-Jul)
  const s2Days = await MatchDay.findAll({ where: { SeasonId: 2 } });
  assert(s2Days.length >= 1, 'Season 2 should have at least 1 match day');
  const hasJul12 = s2Days.some(d => d.date === '2026-07-12');
  assert(hasJul12, 'Season 2 must contain the 2026-07-12 match day');
  console.log(`  ✅ TC-5.6: Season 2 has ${s2Days.length} match day(s) including 2026-07-12`);

  console.log('  🎉 Suite 5 Passed!\n');
}

if (require.main === module) {
  runTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = runTests;
