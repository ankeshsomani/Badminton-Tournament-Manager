const db = require('../config/db');

async function resetSequences() {
  console.log('🔄 Resetting PostgreSQL primary key sequences...');
  const tables = ['Players', 'Users', 'MatchDays', 'Matches', 'Attendances', 'PlayerRatingSnapshots'];

  for (const table of tables) {
    try {
      const seqName = `public."${table}_id_seq"`;
      const query = `SELECT setval('${seqName}', COALESCE((SELECT MAX(id) FROM "${table}"), 1));`;
      await db.query(query);
      console.log(`✅ Sequence reset for [${table}]`);
    } catch (err) {
      console.error(`❌ Error resetting sequence for [${table}]:`, err.message);
    }
  }
}

module.exports = resetSequences;

if (require.main === module) {
  resetSequences().then(() => process.exit(0));
}
