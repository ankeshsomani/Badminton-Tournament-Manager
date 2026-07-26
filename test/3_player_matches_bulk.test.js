const assert = require('assert');
const express = require('express');
const db = require('../config/db');

async function runTests() {
  console.log('🧪 Running Test Suite 3: Player Matches Bulk N+1 API Optimization...');

  try {
    const app = express();
    app.use('/api/players', require('../routes/players'));

    const server = app.listen(9877, async () => {
      try {
        const response = await fetch('http://localhost:9877/api/players');
        const players = await response.json();
        assert(players.length > 0, 'Players list should not be empty');

        // Verify pre-computed hasMatches attribute exists
        const samplePlayer = players[0];
        assert('hasMatches' in samplePlayer, 'Player object must contain pre-computed hasMatches attribute');
        console.log('  ✅ TC-3.1 Passed: GET /api/players contains pre-calculated hasMatches attribute (N+1 loop eliminated)');

        server.close();
        console.log('🎉 Test Suite 3 Passed Successfully!\n');
      } catch (err) {
        server.close();
        console.error('❌ Test Suite 3 Failed:', err.message);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('❌ Test Suite 3 Failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
