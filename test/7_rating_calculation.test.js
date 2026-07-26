/**
 * Test Suite 7: Rating Calculation Logic
 * Validates that the rating system math is correct by examining finalized match data.
 * Note: Only validates Season 2 matches (Season 1 had custom/manual match configurations).
 */
const assert = require('assert');
const { Op } = require('sequelize');

async function runTests() {
  console.log('🧪 Suite 7: Rating Calculation Logic');

  const Player = require('../models/Player');
  const { Match, RatingAwards } = require('../models/Match');
  const MatchDay = require('../models/MatchDay');

  // Only validate Season 2 matches (Season 1 had custom scheduling with different rules)
  const s2Days = await MatchDay.findAll({ where: { SeasonId: 2 }, attributes: ['id'], raw: true });
  const s2DayIds = s2Days.map(d => d.id);

  const s2MatchWhere = s2DayIds.length > 0
    ? { MatchDayId: s2DayIds }
    : {}; // fallback to all if no S2 days

  // TC-7.1: All RatingAwards for M1-M4 (early doubles) are ±5
  const earlyDoubles = await Match.findAll({
    where: { matchCode: ['M1', 'M2', 'M3', 'M4'], ...s2MatchWhere }
  });
  const earlyMatchIds = earlyDoubles.map(m => m.id);
  if (earlyMatchIds.length > 0) {
    const earlyAwards = await RatingAwards.findAll({ where: { MatchId: earlyMatchIds } });
    const nonZeroEarly = earlyAwards.filter(a => a.Rating !== 0);
    for (const a of nonZeroEarly) {
      assert(Math.abs(a.Rating) === 5,
        `M1-M4 RatingAward for MatchId=${a.MatchId} PlayerId=${a.PlayerId} should be ±5, got ${a.Rating}`);
    }
    console.log(`  ✅ TC-7.1: All ${nonZeroEarly.length} finalized S2 M1-M4 awards are ±5`);
  } else {
    console.log('  ⏭️  TC-7.1: Skipped (no S2 M1-M4 matches found)');
  }

  // TC-7.2: All RatingAwards for M5-M8 (singles) are ±10
  const singles = await Match.findAll({
    where: { matchCode: ['M5', 'M6', 'M7', 'M8'], ...s2MatchWhere }
  });
  const singlesIds = singles.map(m => m.id);
  if (singlesIds.length > 0) {
    const singlesAwards = await RatingAwards.findAll({ where: { MatchId: singlesIds } });
    const nonZeroSingles = singlesAwards.filter(a => a.Rating !== 0);
    for (const a of nonZeroSingles) {
      assert(Math.abs(a.Rating) === 10,
        `M5-M8 RatingAward for MatchId=${a.MatchId} PlayerId=${a.PlayerId} should be ±10, got ${a.Rating}`);
    }
    console.log(`  ✅ TC-7.2: All ${nonZeroSingles.length} finalized S2 M5-M8 awards are ±10`);
  } else {
    console.log('  ⏭️  TC-7.2: Skipped (no S2 M5-M8 matches found)');
  }

  // TC-7.3: M9-M10 (variable doubles) awards are ±5 or ±10
  const m9m10 = await Match.findAll({ where: { matchCode: ['M9', 'M10'], ...s2MatchWhere } });
  const m9m10Ids = m9m10.map(m => m.id);
  if (m9m10Ids.length > 0) {
    const m9m10Awards = await RatingAwards.findAll({ where: { MatchId: m9m10Ids } });
    const nonZeroM9 = m9m10Awards.filter(a => a.Rating !== 0);
    for (const a of nonZeroM9) {
      assert([5, -5, 10, -10].includes(a.Rating),
        `M9/M10 award should be ±5 or ±10, got ${a.Rating}`);
    }
    console.log(`  ✅ TC-7.3: All ${nonZeroM9.length} finalized S2 M9-M10 awards are ±5 or ±10`);
  } else {
    console.log('  ⏭️  TC-7.3: Skipped (no S2 M9-M10 matches found)');
  }

  // TC-7.4: M11-M12 (variable doubles) awards are ±5 or ±15
  const m11m12 = await Match.findAll({ where: { matchCode: ['M11', 'M12'], ...s2MatchWhere } });
  const m11m12Ids = m11m12.map(m => m.id);
  if (m11m12Ids.length > 0) {
    const m11m12Awards = await RatingAwards.findAll({ where: { MatchId: m11m12Ids } });
    const nonZeroM11 = m11m12Awards.filter(a => a.Rating !== 0);
    for (const a of nonZeroM11) {
      assert([5, -5, 15, -15].includes(a.Rating),
        `M11/M12 award should be ±5 or ±15, got ${a.Rating}`);
    }
    console.log(`  ✅ TC-7.4: All ${nonZeroM11.length} finalized S2 M11-M12 awards are ±5 or ±15`);
  } else {
    console.log('  ⏭️  TC-7.4: Skipped (no S2 M11-M12 matches found)');
  }

  // TC-7.5: Absence penalties are always -10 (across all seasons)
  const absMatcher = await Match.findAll({ where: { matchCode: 'ABS' } });
  const absIds = absMatcher.map(m => m.id);
  if (absIds.length > 0) {
    const absAwards = await RatingAwards.findAll({ where: { MatchId: absIds } });
    for (const a of absAwards) {
      assert.strictEqual(a.Rating, -10,
        `ABS penalty should be -10, got ${a.Rating} for PlayerId=${a.PlayerId}`);
    }
    console.log(`  ✅ TC-7.5: All ${absAwards.length} absence penalties are -10`);
  } else {
    console.log('  ⏭️  TC-7.5: Skipped (no absence matches found)');
  }

  // TC-7.6: For each finalized match with results, winner Rating is positive and loser is negative
  const finalizedDays = await MatchDay.findAll({ where: { finalized: true } });
  const finalizedDayIds = finalizedDays.map(d => d.id);
  const matchesWithResults = await Match.findAll({
    where: {
      MatchDayId: finalizedDayIds,
      matchCode: { [Op.ne]: 'ABS' },
    }
  });
  let winLoseConsistency = 0;
  for (const m of matchesWithResults) {
    if (!m.winnerIds || !m.loserIds || m.winnerIds.length === 0) continue;
    const awards = await RatingAwards.findAll({ where: { MatchId: m.id } });
    for (const a of awards) {
      if (a.Rating === 0) continue; // unfinished
      if (m.winnerIds.includes(a.PlayerId)) {
        assert(a.Rating > 0, `Winner PlayerId=${a.PlayerId} in MatchId=${m.id} should have positive rating, got ${a.Rating}`);
      } else if (m.loserIds.includes(a.PlayerId)) {
        assert(a.Rating < 0, `Loser PlayerId=${a.PlayerId} in MatchId=${m.id} should have negative rating, got ${a.Rating}`);
      }
      winLoseConsistency++;
    }
  }
  console.log(`  ✅ TC-7.6: ${winLoseConsistency} winner/loser award sign consistency checks passed`);

  // TC-7.7: For S2 players, currentRating = initialRating + sum(all RatingAwards)
  const s2Players = await Player.findAll({ where: { SeasonId: 2 } });
  let ratingMathChecked = 0;
  for (const player of s2Players) {
    const awards = await RatingAwards.findAll({ where: { PlayerId: player.id } });
    if (awards.length === 0) continue;
    const totalDelta = awards.reduce((sum, a) => sum + (a.Rating || 0), 0);
    const expectedRating = player.initialRating + totalDelta;
    assert.strictEqual(player.currentRating, expectedRating,
      `${player.name}: currentRating (${player.currentRating}) != initialRating (${player.initialRating}) + sum(awards) (${totalDelta}) = ${expectedRating}`);
    ratingMathChecked++;
  }
  console.log(`  ✅ TC-7.7: ${ratingMathChecked} S2 players pass currentRating = initialRating + Σ(awards)`);

  console.log('  🎉 Suite 7 Passed!\n');
}

if (require.main === module) {
  runTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
module.exports = runTests;
