const assert = require('assert');
const db = require('../config/db');

async function runTests() {
  console.log('🧪 Running Test Suite 4: Season 2 Rank-Based Baseline Verification...');

  try {
    const Player = require('../models/Player');

    // Test 4.1: Verify Rank 1 (Vishnu Sarda = 900) and Rank 2 (Ashutosh Laddha = 890) and Rank 4 (Ankesh Somani = 870)
    const vishnu = await Player.findOne({ where: { name: 'Vishnu Sarda', SeasonId: 2 } });
    assert.strictEqual(vishnu.rank, 1, 'Vishnu Sarda rank must be 1');
    assert.strictEqual(vishnu.initialRating, 900, 'Vishnu Sarda starting rating must be 900');
    assert.strictEqual(vishnu.currentRating, 900, 'Vishnu Sarda current rating must be 900');

    const ashutosh = await Player.findOne({ where: { name: 'Ashutosh Laddha', SeasonId: 2 } });
    assert.strictEqual(ashutosh.rank, 2, 'Ashutosh Laddha rank must be 2');
    assert.strictEqual(ashutosh.initialRating, 890, 'Ashutosh Laddha starting rating must be 890');

    const ankesh = await Player.findOne({ where: { name: 'Ankesh Somani', SeasonId: 2 } });
    assert.strictEqual(ankesh.rank, 4, 'Ankesh Somani rank must be 4');
    assert.strictEqual(ankesh.initialRating, 870, 'Ankesh Somani starting rating must be 870');

    console.log('  ✅ TC-4.1 Passed: MBPL 2.0 Baseline ratings verified (Vishnu: 900, Ashutosh: 890, Ankesh: 870)');
    console.log('🎉 Test Suite 4 Passed Successfully!\n');
  } catch (err) {
    console.error('❌ Test Suite 4 Failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().then(() => process.exit(0));
}

module.exports = runTests;
