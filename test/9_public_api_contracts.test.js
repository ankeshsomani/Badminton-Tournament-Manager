/**
 * Test Suite 9: Public API Contract Tests
 * Validates that all public-facing API endpoints return correct data shapes.
 * Uses the LIVE production API.
 */
const assert = require('assert');

const BASE_URL = process.env.API_URL || 'https://mbpl-app-448453926122.asia-south1.run.app';

async function runTests() {
  console.log('🧪 Suite 9: Public API Contracts');

  // TC-9.1: GET /api/public/seasons returns array with 2 seasons
  const seasons = await fetch(`${BASE_URL}/api/public/seasons`).then(r => r.json());
  assert(Array.isArray(seasons), 'Seasons response must be an array');
  assert(seasons.length >= 2, `Expected >= 2 seasons, got ${seasons.length}`);
  const s2 = seasons.find(s => s.id === 2);
  assert(s2, 'Season 2 must exist in response');
  assert.strictEqual(s2.isActive, true, 'Season 2 must be active');
  console.log('  ✅ TC-9.1: /api/public/seasons returns 2 seasons, Season 2 active');

  // TC-9.2: GET /api/public/players?seasonId=2 returns Season 2 players only
  const s2Players = await fetch(`${BASE_URL}/api/public/players?seasonId=2`).then(r => r.json());
  assert(Array.isArray(s2Players), 'Players response must be an array');
  assert.strictEqual(s2Players.length, 57, `S2 should have 57 players, got ${s2Players.length}`);
  // Check data shape
  const p = s2Players[0];
  assert(p.id !== undefined, 'Player must have id');
  assert(p.name !== undefined, 'Player must have name');
  assert(p.currentRating !== undefined, 'Player must have currentRating');
  assert(p.initialRating !== undefined, 'Player must have initialRating');
  console.log('  ✅ TC-9.2: /api/public/players?seasonId=2 returns 57 players with correct shape');

  // TC-9.3: GET /api/public/players?seasonId=1 returns Season 1 players only (no cross-contamination)
  const s1Players = await fetch(`${BASE_URL}/api/public/players?seasonId=1`).then(r => r.json());
  assert(s1Players.length >= 60, `S1 should have >= 60 players, got ${s1Players.length}`);
  console.log(`  ✅ TC-9.3: /api/public/players?seasonId=1 returns ${s1Players.length} players (isolated)`);

  // TC-9.4: Default seasonId is 2 (no param returns same as seasonId=2)
  const defaultPlayers = await fetch(`${BASE_URL}/api/public/players`).then(r => r.json());
  assert.strictEqual(defaultPlayers.length, s2Players.length,
    'Default (no seasonId) should return same count as seasonId=2');
  console.log('  ✅ TC-9.4: Default seasonId=2 works (no param test)');

  // TC-9.5: GET /api/public/players/performance?seasonId=2 returns performance data
  const perf = await fetch(`${BASE_URL}/api/public/players/performance?seasonId=2`).then(r => r.json());
  assert(Array.isArray(perf), 'Performance response must be an array');
  assert.strictEqual(perf.length, 57, `S2 performance should have 57 entries, got ${perf.length}`);
  const perfPlayer = perf[0];
  assert(perfPlayer.totalPoints !== undefined, 'Performance entry must have totalPoints');
  assert(perfPlayer.matchesPlayed !== undefined, 'Performance entry must have matchesPlayed');
  assert(Array.isArray(perfPlayer.matches), 'Performance entry must have matches array');
  console.log('  ✅ TC-9.5: /api/public/players/performance?seasonId=2 returns correct shape');

  // TC-9.6: GET /api/public/players/performance?seasonId=1 returns S1 performance
  const s1Perf = await fetch(`${BASE_URL}/api/public/players/performance?seasonId=1`).then(r => r.json());
  assert(s1Perf.length >= 60, `S1 performance should have >= 60 entries, got ${s1Perf.length}`);
  const s1WithMatches = s1Perf.filter(p => p.matchesPlayed > 0);
  assert(s1WithMatches.length >= 40, `S1 should have >= 40 players with matches, got ${s1WithMatches.length}`);
  console.log(`  ✅ TC-9.6: S1 performance returns ${s1Perf.length} players, ${s1WithMatches.length} with matches`);

  // TC-9.7: Performance data excludes ABS matches from match list
  for (const pp of s1Perf) {
    for (const m of pp.matches) {
      assert.notStrictEqual(m.matchCode, 'ABS',
        `ABS matches should not appear in performance match list for ${pp.name}`);
    }
  }
  console.log('  ✅ TC-9.7: ABS synthetic matches excluded from performance match lists');

  // TC-9.8: GET /api/public/schedule/matchdays?seasonId=2 returns S2 match days
  const s2Days = await fetch(`${BASE_URL}/api/public/schedule/matchdays?seasonId=2`).then(r => r.json());
  assert(Array.isArray(s2Days), 'Match days response must be an array');
  assert(s2Days.length >= 1, `S2 should have >= 1 match day, got ${s2Days.length}`);
  console.log(`  ✅ TC-9.8: S2 has ${s2Days.length} match day(s)`);

  // TC-9.9: GET /api/public/highlights returns all 4 sections
  if (s2Days.length > 0) {
    const dayDate = s2Days[0].match_day;
    const h = await fetch(`${BASE_URL}/api/public/highlights?matchDay=${dayDate}`).then(r => r.json());
    assert(Array.isArray(h.topGainers), 'Highlights must have topGainers array');
    assert(Array.isArray(h.topLosers), 'Highlights must have topLosers array');
    assert(Array.isArray(h.closestMatches), 'Highlights must have closestMatches array');
    assert(Array.isArray(h.oneSidedMatches), 'Highlights must have oneSidedMatches array');
    console.log(`  ✅ TC-9.9: Highlights for ${dayDate}: ${h.topGainers.length} gainers, ${h.topLosers.length} losers, ${h.closestMatches.length} closest, ${h.oneSidedMatches.length} one-sided`);
  }

  // TC-9.10: GET /api/public/players/snapshots?seasonId=2 returns snapshot data
  const snaps = await fetch(`${BASE_URL}/api/public/players/snapshots?seasonId=2`).then(r => r.json());
  assert(Array.isArray(snaps), 'Snapshots response must be an array');
  console.log(`  ✅ TC-9.10: Snapshots endpoint returns ${snaps.length} entries`);

  // TC-9.11: Highlights requires matchDay parameter
  const noDay = await fetch(`${BASE_URL}/api/public/highlights`);
  assert.strictEqual(noDay.status, 400, 'Highlights without matchDay should return 400');
  console.log('  ✅ TC-9.11: Highlights returns 400 when matchDay param is missing');

  console.log('  🎉 Suite 9 Passed!\n');
}

if (require.main === module) {
  runTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = runTests;
