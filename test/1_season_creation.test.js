const assert = require('assert');
const db = require('../config/db');

async function runTests() {
  console.log('🧪 Running Test Suite 1: Season Creation & Setup...');

  try {
    const Season = require('../models/Season');
    const MatchDay = require('../models/MatchDay');

    // Test 1.1: Ensure Season model exists and can query Season 1
    const season1 = await Season.findOne({ where: { id: 1 } });
    assert(season1 !== null, 'Season 1 should exist in database');
    console.log('  ✅ TC-1.1 Passed: Season 1 exists (Name:', season1.name, ')');

    // Test 1.2: Ensure Season 2 exists for MBPL 2.0
    const season2 = await Season.findOne({ where: { id: 2 } });
    assert(season2 !== null, 'Season 2 should exist for MBPL 2.0');
    console.log('  ✅ TC-1.2 Passed: Season 2 exists (Name:', season2.name, ')');

    // Test 1.3: Ensure historical MatchDays (IDs 1..12) belong to Season 1
    const season1Days = await MatchDay.findAll({ where: { SeasonId: 1 } });
    assert(season1Days.length >= 7, 'Season 1 should have at least 7 match days');
    console.log('  ✅ TC-1.3 Passed:', season1Days.length, 'historical MatchDays belong to Season 1');

    console.log('🎉 Test Suite 1 Passed Successfully!\n');
  } catch (err) {
    console.error('❌ Test Suite 1 Failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().then(() => process.exit(0));
}

module.exports = runTests;
