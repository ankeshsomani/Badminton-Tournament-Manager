const { Sequelize } = require('sequelize');
require('dotenv').config();

// Define models for Source (MySQL)
function initModels(sequelizeInstance) {
  const User = require('../models/User');
  const Player = require('../models/Player');
  const MatchDay = require('../models/MatchDay');
  const Match = require('../models/Match');
  const Attendance = require('../models/Attendance');
  const PlayerRatingSnapshot = require('../models/PlayerRatingSnapshot');

  return { User, Player, MatchDay, Match, Attendance, PlayerRatingSnapshot };
}

async function migrateData() {
  console.log('🚀 Starting Data Migration: MySQL ➡️ PostgreSQL (Supabase / Neon)');

  // 1. Source Database (MySQL)
  const sourceDb = new Sequelize({
    dialect: 'mysql',
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'badminton_tournament',
    logging: false,
  });

  // 2. Target Database (PostgreSQL)
  const targetUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
  if (!targetUrl) {
    console.error('❌ Error: Please set TARGET_DATABASE_URL or DATABASE_URL in your environment or .env file.');
    console.error('Example: TARGET_DATABASE_URL="postgres://postgres:pass@db.xxxx.supabase.co:5432/postgres"');
    process.exit(1);
  }

  const targetDb = new Sequelize(targetUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });

  try {
    console.log('🔌 Testing MySQL connection...');
    await sourceDb.authenticate();
    console.log('✅ Connected to source MySQL database.');

    console.log('🔌 Testing PostgreSQL connection...');
    await targetDb.authenticate();
    console.log('✅ Connected to target PostgreSQL database.');

    // Import models for both connections
    const sourceModels = {
      User: sourceDb.define('User', require('../models/User').rawAttributes || {}, { tableName: 'Users' }),
      Player: sourceDb.define('Player', require('../models/Player').rawAttributes || {}, { tableName: 'Players' }),
      MatchDay: sourceDb.define('MatchDay', require('../models/MatchDay').rawAttributes || {}, { tableName: 'MatchDays' }),
      Match: sourceDb.define('Match', require('../models/Match').rawAttributes || {}, { tableName: 'Matches' }),
      Attendance: sourceDb.define('Attendance', require('../models/Attendance').rawAttributes || {}, { tableName: 'Attendances' }),
      PlayerRatingSnapshot: sourceDb.define('PlayerRatingSnapshot', require('../models/PlayerRatingSnapshot').rawAttributes || {}, { tableName: 'PlayerRatingSnapshots' }),
    };

    console.log('🏗 Syncing target PostgreSQL schema...');
    // Sync schema using main app models on target DB
    const appDb = require('../config/db');
    await appDb.sync({ force: true });
    console.log('✅ Target schema created in PostgreSQL.');

    // Table copy list in order of foreign key dependencies
    const tables = [
      { name: 'Users', model: sourceModels.User, targetModel: require('../models/User') },
      { name: 'Players', model: sourceModels.Player, targetModel: require('../models/Player') },
      { name: 'MatchDays', model: sourceModels.MatchDay, targetModel: require('../models/MatchDay') },
      { name: 'Matches', model: sourceModels.Match, targetModel: require('../models/Match') },
      { name: 'Attendances', model: sourceModels.Attendance, targetModel: require('../models/Attendance') },
      { name: 'PlayerRatingSnapshots', model: sourceModels.PlayerRatingSnapshot, targetModel: require('../models/PlayerRatingSnapshot') },
    ];

    for (const table of tables) {
      try {
        console.log(`📦 Fetching records from MySQL [${table.name}]...`);
        const records = await table.model.findAll({ raw: true });
        console.log(`  Found ${records.length} records in [${table.name}].`);

        if (records.length > 0) {
          console.log(`  Inserting into PostgreSQL [${table.name}]...`);
          await table.targetModel.bulkCreate(records, { ignoreDuplicates: true });
          console.log(`  ✅ Successfully migrated ${records.length} records to [${table.name}].`);
        }
      } catch (err) {
        console.warn(`⚠️ Warning migrating table ${table.name}:`, err.message);
      }
    }

    console.log('\n🎉 Data Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateData();
