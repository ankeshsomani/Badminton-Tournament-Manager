const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const User = require('../models/User');
const Player = require('../models/Player');
const MatchDay = require('../models/MatchDay');
const { Match, RatingAwards } = require('../models/Match');
const Attendance = require('../models/Attendance');
const PlayerRatingSnapshot = require('../models/PlayerRatingSnapshot');

function parseSqlVal(raw, colName) {
  let trimmed = raw.trim();
  if (trimmed.toUpperCase() === 'NULL') return null;

  // Boolean columns explicitly
  const booleanCols = ['present', 'isCompleted', 'isActive', 'hasPlayed'];
  if (booleanCols && colName && booleanCols.includes(colName)) {
    if (trimmed === '1' || trimmed.toLowerCase() === 'true') return true;
    if (trimmed === '0' || trimmed.toLowerCase() === 'false') return false;
  }

  // Handle JSON columns (team1, team2, winnerIds, loserIds) or quoted strings
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    let unquoted = trimmed.slice(1, -1);
    unquoted = unquoted.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    
    // Parse JSON arrays for team1, team2, winnerIds, loserIds
    if (['team1', 'team2', 'winnerIds', 'loserIds'].includes(colName)) {
      try {
        return JSON.parse(unquoted);
      } catch (e) {
        return unquoted;
      }
    }
    return unquoted;
  }

  if (!isNaN(trimmed) && trimmed !== '') return Number(trimmed);
  return trimmed;
}

function parseInsertTuples(insertText) {
  const colMatch = insertText.match(/INSERT INTO `\w+` \(([^)]+)\) VALUES/i);
  if (!colMatch) return null;

  const columns = colMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
  
  const valuesIdx = insertText.search(/VALUES/i);
  if (valuesIdx === -1) return null;
  
  const valuesStr = insertText.slice(valuesIdx + 6).trim();

  const rows = [];
  let inTuple = false;
  let inString = false;
  let stringChar = '';
  let currentVal = '';
  let currentTuple = [];

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    const prevChar = i > 0 ? valuesStr[i - 1] : '';

    if (!inTuple) {
      if (char === '(') {
        inTuple = true;
        currentTuple = [];
        currentVal = '';
      }
    } else {
      if (inString) {
        currentVal += char;
        if (char === stringChar && prevChar !== '\\') {
          inString = false;
        }
      } else {
        if (char === "'" || char === '"') {
          inString = true;
          stringChar = char;
          currentVal += char;
        } else if (char === ',') {
          const colName = columns[currentTuple.length];
          currentTuple.push(parseSqlVal(currentVal, colName));
          currentVal = '';
        } else if (char === ')') {
          const colName = columns[currentTuple.length];
          currentTuple.push(parseSqlVal(currentVal, colName));
          
          const rowObj = {};
          columns.forEach((col, idx) => {
            rowObj[col] = currentTuple[idx];
          });
          rows.push(rowObj);

          inTuple = false;
          currentTuple = [];
          currentVal = '';
        } else if (char !== '\n' && char !== '\r') {
          currentVal += char;
        }
      }
    }
  }
  return { columns, rows };
}

async function importSqlDump() {
  console.log('🚀 Starting Smart SQL Dump Import to Supabase PostgreSQL...');

  try {
    await db.authenticate();
    console.log('✅ Connected to Supabase PostgreSQL.');

    const sqlFilePath = path.join(__dirname, '..', 'db-dump.sql');
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL dump file not found at:', sqlFilePath);
      process.exit(1);
    }

    console.log('📄 Reading db-dump.sql...');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('🏗 Syncing database schema with PostgreSQL...');
    await db.sync({ force: true });
    console.log('✅ Tables created in PostgreSQL.');

    const tableModels = [
      { name: 'Users', model: User },
      { name: 'Players', model: Player },
      { name: 'MatchDays', model: MatchDay },
      { name: 'Matches', model: Match },
      { name: 'Attendances', model: Attendance },
      { name: 'PlayerRatingSnapshots', model: PlayerRatingSnapshot },
      { name: 'RatingAwards', model: RatingAwards }
    ];

    const lines = sqlContent.split('\n');

    for (const item of tableModels) {
      const tableName = item.name;
      const model = item.model;
      
      console.log(`\n📦 Processing table [${tableName}]...`);
      
      let tableInsertSql = '';
      let capturing = false;

      for (const line of lines) {
        if (line.trim().startsWith(`INSERT INTO \`${tableName}\``)) {
          capturing = true;
          tableInsertSql += line + '\n';
        } else if (capturing) {
          tableInsertSql += line + '\n';
          if (line.trim().endsWith(';')) {
            capturing = false;
          }
        }
      }

      if (tableInsertSql) {
        const parsed = parseInsertTuples(tableInsertSql);
        if (parsed && parsed.rows.length > 0) {
          console.log(`  Parsed ${parsed.rows.length} rows for [${tableName}].`);
          
          await model.bulkCreate(parsed.rows, { ignoreDuplicates: true });
          console.log(`  ✅ Successfully imported ${parsed.rows.length} rows into [${tableName}].`);
        } else {
          console.log(`  ⚠️ No valid rows extracted for [${tableName}].`);
        }
      } else {
        console.log(`  ℹ️ No INSERT statements found for [${tableName}].`);
      }
    }

    console.log('\n🎉 ALL Live Data successfully imported from db-dump.sql into Supabase PostgreSQL!');
    process.exit(0);

  } catch (error) {
    console.error('❌ SQL Dump Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

importSqlDump();
