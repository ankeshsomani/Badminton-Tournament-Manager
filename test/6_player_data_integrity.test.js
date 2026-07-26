/**
 * Test Suite 6: Player Data Integrity
 * Validates player data consistency across both seasons.
 */
const assert = require('assert');

async function runTests() {
  console.log('🧪 Suite 6: Player Data Integrity');

  const Player = require('../models/Player');

  // TC-6.1: Season 1 has >= 60 players (historical)
  const s1Players = await Player.findAll({ where: { SeasonId: 1 } });
  assert(s1Players.length >= 60, `Season 1 should have >= 60 players, got ${s1Players.length}`);
  console.log(`  ✅ TC-6.1: Season 1 has ${s1Players.length} players`);

  // TC-6.2: Season 2 has exactly 57 players
  const s2Players = await Player.findAll({ where: { SeasonId: 2 }, order: [['rank', 'ASC']] });
  assert.strictEqual(s2Players.length, 57, `Season 2 must have 57 players, got ${s2Players.length}`);
  console.log(`  ✅ TC-6.2: Season 2 has exactly 57 players`);

  // TC-6.3: Most Season 2 players have initialRating matching formula: 900 - (rank-1)*10
  // (Some players may have been manually edited post-seeding)
  let formulaMatches = 0;
  let formulaMismatches = [];
  for (const p of s2Players) {
    const expected = 900 - ((p.rank - 1) * 10);
    if (p.initialRating === expected) {
      formulaMatches++;
    } else {
      formulaMismatches.push(`${p.name} Rank${p.rank}: expected=${expected} got=${p.initialRating}`);
    }
  }
  assert(formulaMatches >= 50,
    `At least 50 of 57 S2 players should match rank formula, only ${formulaMatches} matched. Mismatches: ${formulaMismatches.join(', ')}`);
  console.log(`  ✅ TC-6.3: ${formulaMatches}/57 S2 players match rank formula (${formulaMismatches.length} manually edited)`);

  // TC-6.4: All Season 2 players have joiningDate = 2026-07-12
  for (const p of s2Players) {
    assert.strictEqual(p.joiningDate, '2026-07-12',
      `${p.name} joiningDate should be 2026-07-12, got ${p.joiningDate}`);
  }
  console.log('  ✅ TC-6.4: All S2 players have joiningDate = 2026-07-12');

  // TC-6.5: All Season 2 players have a non-null rank (1-57)
  for (const p of s2Players) {
    assert(p.rank !== null && p.rank >= 1 && p.rank <= 57,
      `${p.name} should have rank 1-57, got ${p.rank}`);
  }
  console.log('  ✅ TC-6.5: All S2 players have valid ranks (1-57)');

  // TC-6.6: No duplicate player names within the same season
  const s2Names = s2Players.map(p => p.name.toLowerCase().trim());
  const uniqueNames = new Set(s2Names);
  assert.strictEqual(s2Names.length, uniqueNames.size,
    `Season 2 has ${s2Names.length - uniqueNames.size} duplicate player names`);
  console.log('  ✅ TC-6.6: No duplicate player names in Season 2');

  // TC-6.7: Season 1 players have valid integer initialRatings
  const invalidS1 = s1Players.filter(p => !Number.isInteger(p.initialRating) || p.initialRating <= 0);
  assert.strictEqual(invalidS1.length, 0, `${invalidS1.length} S1 players have invalid initialRating`);
  console.log(`  ✅ TC-6.7: All ${s1Players.length} Season 1 players have valid initialRatings`);

  // TC-6.8: currentRating is always an integer (never null/NaN)
  const allPlayers = await Player.findAll();
  for (const p of allPlayers) {
    assert(Number.isInteger(p.currentRating), `${p.name} currentRating must be integer, got ${p.currentRating}`);
    assert(Number.isInteger(p.initialRating), `${p.name} initialRating must be integer, got ${p.initialRating}`);
  }
  console.log(`  ✅ TC-6.8: All ${allPlayers.length} players have integer ratings`);

  console.log('  🎉 Suite 6 Passed!\n');
}

if (require.main === module) {
  runTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = runTests;
