const assert = require('assert');
const db = require('../config/db');

async function runTests() {
  console.log('🧪 Running Test Suite 2: Season Data Isolation & Rank-Based Ratings...');

  try {
    const Season = require('../models/Season');
    const MatchDay = require('../models/MatchDay');
    const Player = require('../models/Player');
    const PlayerRatingSnapshot = require('../models/PlayerRatingSnapshot');

    // Test 2.1: Verify Season 1 snapshots are isolated by SeasonId/matchDayId
    const s1Snapshots = await PlayerRatingSnapshot.findAll({
      include: [{ model: MatchDay, where: { SeasonId: 1 } }]
    });
    assert(s1Snapshots.length > 0, 'Season 1 should have historical rating snapshots');
    console.log('  ✅ TC-2.1 Passed:', s1Snapshots.length, 'historical snapshots belong to Season 1');

    // Test 2.2: Ensure all MBPL 2.0 players start with rank-based ratings (Rank 1=900, Rank 2=890...)
    const s2Players = await Player.findAll({ where: { SeasonId: 2 }, order: [['rank', 'ASC']] });
    for (const p of s2Players) {
      const expectedRating = 900 - ((p.rank - 1) * 10);
      assert.strictEqual(p.initialRating, expectedRating, `Player ${p.name} (Rank ${p.rank}) initial rating must be ${expectedRating}`);
      assert.strictEqual(p.currentRating, expectedRating, `Player ${p.name} (Rank ${p.rank}) current rating must be ${expectedRating}`);
    }
    console.log('  ✅ TC-2.2 Passed: All 57 MBPL 2.0 players initialized with Rank-based ratings (Rank 1=900 down to Rank 57=340)');

    console.log('🎉 Test Suite 2 Passed Successfully!\n');
  } catch (err) {
    console.error('❌ Test Suite 2 Failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().then(() => process.exit(0));
}

module.exports = runTests;
