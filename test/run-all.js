/**
 * MBPL Functional Test Suite - Test Runner
 * 
 * Runs all functional tests against the LIVE database.
 * Usage: node test/run-all.js
 * 
 * These tests are READ-ONLY assertions against production data.
 * They verify that existing data is consistent and business rules hold.
 */

const db = require('../config/db');

const testSuites = [
  { name: 'Season & Structure', file: './5_season_structure.test' },
  { name: 'Player Data Integrity', file: './6_player_data_integrity.test' },
  { name: 'Rating Calculation Logic', file: './7_rating_calculation.test' },
  { name: 'Attendance & MatchDay', file: './8_attendance_matchday.test' },
  { name: 'Public API Contracts', file: './9_public_api_contracts.test' },
  { name: 'Season Isolation', file: './10_season_isolation.test' },
  { name: 'Finalization Integrity', file: './11_finalization_integrity.test' },
  { name: 'Edge Cases & Guards', file: './12_edge_cases.test' },
];

async function runAll() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🏸  MBPL Badminton Tournament Manager — Functional Tests');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const suite of testSuites) {
    try {
      const runTests = require(suite.file);
      await runTests();
      passed++;
    } catch (err) {
      failed++;
      failures.push({ name: suite.name, error: err.message });
      console.error(`❌ Suite "${suite.name}" failed: ${err.message}\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed out of ${testSuites.length} suites`);
  if (failures.length > 0) {
    console.log('\n  Failures:');
    failures.forEach(f => console.log(`    ❌ ${f.name}: ${f.error}`));
  }
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

runAll();
