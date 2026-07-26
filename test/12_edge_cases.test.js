/**
 * Test Suite 12: Edge Cases & Guards
 * Tests boundary conditions, error handling, and data guards.
 */
const assert = require('assert');

async function runTests() {
  console.log('🧪 Suite 12: Edge Cases & Guards');

  const Player = require('../models/Player');
  const { Match, RatingAwards } = require('../models/Match');
  const MatchDay = require('../models/MatchDay');

  const BASE_URL = process.env.API_URL || 'https://mbpl-app-448453926122.asia-south1.run.app';

  // TC-12.1: Highlights endpoint rejects missing matchDay param with 400
  const resp1 = await fetch(`${BASE_URL}/api/public/highlights`);
  assert.strictEqual(resp1.status, 400, 'Missing matchDay should return 400');
  console.log('  ✅ TC-12.1: Highlights rejects missing matchDay with 400');

  // TC-12.2: Highlights for a non-existent date returns empty arrays (not 500)
  const resp2 = await fetch(`${BASE_URL}/api/public/highlights?matchDay=1999-01-01`);
  assert.strictEqual(resp2.status, 200, 'Non-existent date should still return 200');
  const h = await resp2.json();
  assert.strictEqual(h.topGainers.length, 0, 'No gainers for non-existent date');
  assert.strictEqual(h.topLosers.length, 0, 'No losers for non-existent date');
  console.log('  ✅ TC-12.2: Highlights for non-existent date returns empty arrays gracefully');

  // TC-12.3: Performance endpoint with invalid seasonId returns empty array
  const resp3 = await fetch(`${BASE_URL}/api/public/players/performance?seasonId=999`);
  assert.strictEqual(resp3.status, 200, 'Invalid seasonId should return 200');
  const perfData = await resp3.json();
  assert.strictEqual(perfData.length, 0, 'Invalid seasonId should return 0 players');
  console.log('  ✅ TC-12.3: Performance with invalid seasonId returns empty array');

  // TC-12.4: Player list with invalid seasonId returns empty array
  const resp4 = await fetch(`${BASE_URL}/api/public/players?seasonId=999`);
  const playerData = await resp4.json();
  assert.strictEqual(playerData.length, 0, 'Invalid seasonId should return 0 players');
  console.log('  ✅ TC-12.4: Player list with invalid seasonId returns empty array');

  // TC-12.5: No player has negative currentRating
  const allPlayers = await Player.findAll();
  const negativeRatings = allPlayers.filter(p => p.currentRating < 0);
  assert.strictEqual(negativeRatings.length, 0,
    `${negativeRatings.length} players have negative currentRating: ${negativeRatings.map(p => `${p.name}=${p.currentRating}`).join(', ')}`);
  console.log(`  ✅ TC-12.5: No players have negative currentRating (checked ${allPlayers.length})`);

  // TC-12.6: ABS synthetic matches have null court and empty teams
  const absMatches = await Match.findAll({ where: { matchCode: 'ABS' } });
  for (const m of absMatches) {
    assert.strictEqual(m.court, null, `ABS match ${m.id} should have null court`);
    assert.strictEqual(m.matchType, 'absence', `ABS match ${m.id} should have matchType=absence`);
    assert.deepStrictEqual(m.team1, [], `ABS match ${m.id} should have empty team1`);
    assert.deepStrictEqual(m.team2, [], `ABS match ${m.id} should have empty team2`);
  }
  console.log(`  ✅ TC-12.6: All ${absMatches.length} ABS matches have null court and empty teams`);

  // TC-12.7: Match codes follow expected pattern (M1-M12 or ABS)
  const validCodes = new Set(['M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12','ABS']);
  const allMatches = await Match.findAll({ attributes: ['matchCode'] });
  const invalidCodes = allMatches.filter(m => !validCodes.has(m.matchCode));
  assert.strictEqual(invalidCodes.length, 0,
    `Found ${invalidCodes.length} matches with invalid codes: ${invalidCodes.map(m => m.matchCode).join(', ')}`);
  console.log(`  ✅ TC-12.7: All ${allMatches.length} matches have valid match codes`);

  // TC-12.8: Match types are either 'singles', 'doubles', or 'absence'
  const allMatchesFull = await Match.findAll({ attributes: ['matchType', 'matchCode'] });
  for (const m of allMatchesFull) {
    assert(['singles', 'doubles', 'absence'].includes(m.matchType),
      `Match ${m.matchCode} has invalid matchType: ${m.matchType}`);
  }
  console.log(`  ✅ TC-12.8: All matches have valid matchType (singles/doubles/absence)`);

  // TC-12.9: In S2, singles matches (M5-M8) have 1 player per team, doubles have 2
  // (Season 1 had custom match formats, so only validate S2)
  const s2DayIds = (await MatchDay.findAll({ where: { SeasonId: 2 }, attributes: ['id'], raw: true })).map(d => d.id);
  if (s2DayIds.length > 0) {
    const s2Singles = await Match.findAll({ where: { matchCode: ['M5','M6','M7','M8'], MatchDayId: s2DayIds } });
    for (const m of s2Singles) {
      assert.strictEqual(m.team1.length, 1, `S2 Singles ${m.matchCode} team1 should have 1 player`);
      assert.strictEqual(m.team2.length, 1, `S2 Singles ${m.matchCode} team2 should have 1 player`);
    }
    const s2Doubles = await Match.findAll({
      where: { matchCode: ['M1','M2','M3','M4','M9','M10','M11','M12'], MatchDayId: s2DayIds }
    });
    for (const m of s2Doubles) {
      assert.strictEqual(m.team1.length, 2, `S2 Doubles ${m.matchCode} team1 should have 2 players`);
      assert.strictEqual(m.team2.length, 2, `S2 Doubles ${m.matchCode} team2 should have 2 players`);
    }
    console.log(`  ✅ TC-12.9: S2 singles (${s2Singles.length}) have 1 player/team, doubles (${s2Doubles.length}) have 2`);
  } else {
    console.log('  ⏭️  TC-12.9: Skipped (no S2 match days)');
  }

  // TC-12.10: Unauthenticated admin API call returns 401
  const resp5 = await fetch(`${BASE_URL}/api/players`);
  assert.strictEqual(resp5.status, 401, 'Admin /api/players without token should return 401');
  console.log('  ✅ TC-12.10: Admin API rejects unauthenticated requests with 401');

  console.log('  🎉 Suite 12 Passed!\n');
}

if (require.main === module) {
  runTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = runTests;
