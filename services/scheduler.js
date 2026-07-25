const { Match, RatingAwards } = require('../models/Match');
const Player = require('../models/Player');
const MatchDay = require('../models/MatchDay');
const PlayerRatingSnapshot = require('../models/PlayerRatingSnapshot');
const Attendance = require('../models/Attendance');
const XLSX = require('xlsx');

const totalCourtsAvailable = parseInt(process.env.TOTAL_COURTS_AVAILABLE, 10) || 6;
const defaultPeoplePerCourt = parseInt(process.env.DEFAULT_PEOPLE_PER_COURT, 10) || 8;

/**
 * Read matches from an Excel file and return sequential match codes with type.
 * 
 * @param {string} filePath - Path to XLSX file (e.g., 'match-schedule.xlsx').
 * @param {number} numPlayers - Number of players (4,5,6,7,8,9,10,11).
 * @param {object} opts - Optional options:
 *   - sheetName: if provided, read only this sheet; else read the first sheet.
 *   - strict: if true, drop rows where any player number exceeds numPlayers.
 *             default true.
 *   - headerRowIndex: which row contains column headers (0-based, default 0).
 * @returns {Array<{code:string, team:string, type:string}>}
 */
function getMatches(filePath, numPlayers, opts = {}) {
  console.log("*****getMatches called for players: ", numPlayers);
  const strict = opts.strict !== false; // default true
  const wb = XLSX.readFile(filePath);
  const sheetName = opts.sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Produce rows as arrays preserving blank cells
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (!rows.length) return [];

  // Find the target column by matching header text like "8 Players"
  const header = rows[0];
  const wantedHeaderText = `${numPlayers} Players`;
  const colIndex = header.findIndex(h => String(h || '').trim().toLowerCase() === wantedHeaderText.toLowerCase());

  if (colIndex === -1) {
    throw new Error(`Column "${wantedHeaderText}" not found in sheet "${sheetName}".`);
  }

  // First column holds the match "type"
  const typeColIndex = 0;
  const out = [];
  let n = 1;

  for (let r = 1; r < rows.length; r++) {
    const type = (rows[r][typeColIndex] || '').toString().trim();
    const team = (rows[r][colIndex] || '').toString().trim();

    if (!team) continue; // skip blank

    // If strict, skip any team string referencing a player number greater than numPlayers
    if (strict) {
      const nums = (team.match(/\d+/g) || []).map(Number);
      if (nums.some(v => v > numPlayers)) continue;
    }

    out.push({
      code: `M${n++}`,
      team,
      type
    });
  }

  return out;
}

// Helper function to parse team strings like "1-4 v/s 2-3" or "1 v/s 2"
function parseTeamString(teamStr, numPlayers) {
  try {
    // Split by "v/s" or "vs"
    const parts = teamStr.split(/\s+v\/s\s+|\s+vs\s+/i);
    if (parts.length !== 2) return { team1Indices: null, team2Indices: null, matchType: null };

    const [team1Str, team2Str] = parts;

    // Parse team indices (convert from 1-based to 0-based)
    const parseTeam = (str) => {
      if (str.includes('-')) {
        // Doubles: "1-4" means players 1 and 4
        return str.split('-').map(n => parseInt(n.trim()) - 1);
      } else {
        // Singles: "1" means player 1
        return [parseInt(str.trim()) - 1];
      }
    };

    const team1Indices = parseTeam(team1Str);
    const team2Indices = parseTeam(team2Str);

    // Validate indices are within range
    const allIndices = [...team1Indices, ...team2Indices];
    if (allIndices.some(idx => idx < 0 || idx >= numPlayers)) {
      console.log(`Invalid player indices for ${numPlayers} players: ${teamStr}`);
      return { team1Indices: null, team2Indices: null, matchType: null };
    }

    // Determine match type
    const matchType = (team1Indices.length === 1 && team2Indices.length === 1) ? 'singles' : 'doubles';

    return { team1Indices, team2Indices, matchType };
  } catch (error) {
    console.error(`Error parsing team string "${teamStr}":`, error);
    return { team1Indices: null, team2Indices: null, matchType: null };
  }
}

async function generateSchedule(date = new Date()) {
  try {
    let matchDay = await MatchDay.findOne({ where: { date } });
    if (!matchDay) matchDay = await MatchDay.create({ date });

    // Defensive: check Attendance table exists and query works
    let attendance;
    try {
      attendance = await Attendance.findAll({
        where: { MatchDayId: matchDay.id, present: true },
        include: [{ model: Player }],
        order: [[Player, 'currentRating', 'DESC'], [Player, 'initialRating', 'DESC']]
      });
    } catch (err) {
      console.error('Attendance query error:', err);
      throw err;
    }
    const present = attendance.filter(a => a.Player).map(a => a.Player);
    console.log('present people:-', present);
    const courts = [];
    for (let i = 0; i < present.length; i += 8) {
      const group = present.slice(i, i + 8);
      if (group.length < 8) break;
      const codes = [
        ['M1', [[0,3],[1,2]]], ['M2', [[4,7],[5,6]]], ['M3', [[2,5],[3,4]]],['M4', [[0,7],[1,6]]],
        ['M5', [[0],[1]]], ['M6', [[2],[3]]], ['M7', [[4],[5]]], ['M8', [[6],[7]]],
        ['M9', [[0,2],[1,3]]], ['M10',[[4,6],[5,7]]], ['M11',[[0,1],[2,3]]], ['M12',[[4,5],[6,7]]]
      ];
      const matches = [];
      for (const [code, [t1, t2]] of codes) {
        const team1 = t1.map(idx => group[idx].id);
        const team2 = t2.map(idx => group[idx].id);
        const match = await Match.create({
          court: (i/8)+1,
          matchCode: code,
          matchType: t1.length === 1 && t2.length === 1 ? 'singles' : 'doubles',
          date,
          team1,
          team2,
          MatchDayId: matchDay.id
        });
        // Fetch Player instances and add to match
        for (const pid of [...team1, ...team2]) {
          const player = await Player.findByPk(pid);
          if (player) {
            await match.addPlayer(player, { through: { Rating: 0 } });
            console.log(`Added RatingAwards entry for MatchId ${match.id}, PlayerId ${pid}`);
          } else {
            console.log(`PlayerId ${pid} not found, cannot add to MatchId ${match.id}`);
          }
        }
        matches.push(match);
        console.log(`Created match ${match.id} with players:`, [...team1, ...team2]);
      }
      courts.push({ court: (i/8)+1, matches });
    }
    return courts;
  } catch (error) {
    console.error('generateSchedule error:', error);
    throw error;
  }
}

async function recordResult(matchId, winnerIds, score) {
  const match = await Match.findByPk(matchId);
  if (!match) throw new Error(`Match with id ${matchId} not found`);

  // Get all player IDs for this match from RatingAwards
  const awards = await RatingAwards.findAll({ where: { MatchId: matchId } });
  console.log(`RatingAwards entries for MatchId ${matchId}:`, awards.map(a => ({ PlayerId: a.PlayerId, Rating: a.Rating })));
  const allIds = awards.map(a => a.PlayerId);
  const loserIds = allIds.filter(id => !winnerIds.includes(id));

  match.score = score;
  match.winnerIds = winnerIds;
  match.loserIds = loserIds;
  await match.save();
  console.log('Updated match.loserIds:', match.loserIds);

  // Calculate rating changes but only store in RatingAwards
  const winners = await Player.findAll({ where: { id: winnerIds } });
  const losers = await Player.findAll({ where: { id: loserIds } });
  let wDelta, lDelta;
  const code = match.matchCode;
  if (["M1","M2","M3","M4"].includes(code)) { wDelta=5; lDelta=-5; }
  else if (["M5","M6","M7","M8"].includes(code)) { wDelta=10; lDelta=-10; }
  else if (["M9","M10","M11","M12"].includes(code)) {
    const winningTeamCurrentRatingsSum = winners.reduce((s,p)=>s+(p.currentRating||0),0);
    const losingTeamCurrentRatingsSum = losers.reduce((s,p)=>s+(p.currentRating||0),0);
    console.log(`winningTeamCurrentRatingsSum: ${winningTeamCurrentRatingsSum}, losingTeamRatingsSum: ${losingTeamCurrentRatingsSum}`);

    const winningTeamInitialRatingsSum = winners.reduce((s,p)=>s+(p.initialRating||0),0);
    const losingTeamInitialRatingsSum = losers.reduce((s,p)=>s+(p.initialRating||0),0);
    console.log(`winningTeamInitialRatingsSum: ${winningTeamInitialRatingsSum}, losingTeamInitialRatingsSum: ${losingTeamInitialRatingsSum}`);

    // Determine weaker team: prefer current rating sums; if equal, fall back to initial rating sums
    const isWiningTeamWeaker = (winningTeamCurrentRatingsSum === losingTeamCurrentRatingsSum)
      ? (winningTeamInitialRatingsSum < losingTeamInitialRatingsSum)
      : (winningTeamCurrentRatingsSum < losingTeamCurrentRatingsSum);
    console.log(`isWiningTeamWeaker: ${isWiningTeamWeaker}`);
    if (["M9","M10"].includes(code))
      [wDelta,lDelta] = isWiningTeamWeaker ? [10,-10] : [5,-5];
    else if (["M11","M12"].includes(code))
      [wDelta,lDelta] = isWiningTeamWeaker ? [15,-15] : [5,-5];
  } else {
    const sumW = winners.reduce((s,p)=>s+(p.currentRating||p.rating||0),0);
    const sumL = losers.reduce((s,p)=>s+(p.currentRating||p.rating||0),0);
    [wDelta,lDelta] = sumW<sumL ? [15,-5] : [5,-15];
  }

  // Store rating changes in RatingAwards table only
  for (const p of winners) {
    const [affectedRows] = await RatingAwards.update({ Rating: wDelta }, { where: { MatchId: match.id, PlayerId: p.id } });
    console.log(`RatingAwards update for winner PlayerId ${p.id}:`, affectedRows);
  }
  for (const p of losers) {
    const [affectedRows] = await RatingAwards.update({ Rating: lDelta }, { where: { MatchId: match.id, PlayerId: p.id } });
    console.log(`RatingAwards update for loser PlayerId ${p.id}:`, affectedRows);
  }

  console.log('Final match object:', match.toJSON());
  return match;
}

async function finalizeMatches(matchDayId) {
  try {
    // Get all matches for the given matchDayId
    const matches = await Match.findAll({ where: { MatchDayId: matchDayId } });
    if (!matches.length) throw new Error(`No matches found for matchDayId ${matchDayId}`);

    // Get all RatingAwards for these matches
    const matchIds = matches.map(m => m.id);
    const ratingAwards = await RatingAwards.findAll({ where: { MatchId: matchIds } });

    // Group ratings by player
    const playerRatings = {};
    for (const award of ratingAwards) {
      if (!playerRatings[award.PlayerId]) {
        playerRatings[award.PlayerId] = 0;
      }
      playerRatings[award.PlayerId] += award.Rating;
    }

    // Apply -10 penalty for absentees
    const absentees = await Attendance.findAll({ where: { MatchDayId: matchDayId, present: false } });
    const now = new Date();
    let penalizedPlayers = [];
    // Get the MatchDay date for correct award attribution
    const matchDayObj = await MatchDay.findByPk(matchDayId);
    const matchDayDate = matchDayObj ? matchDayObj.date : null;

    if (absentees.length) {
      // Create a synthetic match representing absences so MatchId is non-null
      const absenceMatch = await Match.create({
        matchCode: 'ABS',
        matchType: 'absence',
        date: matchDayDate,
        court: null,
        team1: [],
        team2: [],
        MatchDayId: matchDayId,
      });

      for (const absent of absentees) {
        const player = await Player.findByPk(absent.PlayerId);
        if (player) {
          await player.update({ currentRating: player.currentRating - 10, 
            lastRatingUpdatedOn: now });
          await RatingAwards.create({
            Rating: -10,
            PlayerId: player.id,
            MatchId: absenceMatch.id,
            date: matchDayDate,
          });
          penalizedPlayers.push(player.id);
          console.log(`Penalty: -10 for absent player ${player.id}`);
        }
      }
    }

    // Update player ratings and lastRatingUpdatedOn for match deltas
    for (const [playerId, totalDelta] of Object.entries(playerRatings)) {
      const player = await Player.findByPk(playerId);
      if (player) {
        await player.update({ currentRating: player.currentRating + totalDelta, lastRatingUpdatedOn: now });
        console.log(`Updated currentRating for player ${playerId}: ${player.currentRating} (${totalDelta > 0 ? '+' : ''}${totalDelta}), lastRatingUpdatedOn: ${now}`);
      }
    }

    // Persist rating snapshots for all affected players (including absentees)
    const affectedPlayerIds = new Set([
      ...Object.keys(playerRatings).map(id=>parseInt(id,10)),
      ...penalizedPlayers
    ]);
    for (const pid of affectedPlayerIds) {
      const pl = await Player.findByPk(pid);
      if (pl) {
        await PlayerRatingSnapshot.upsert({
          playerId: pid,
          matchDayId: matchDayId,
          rating: pl.currentRating,
        });
      }
    }

    // Mark MatchDay as finalized
    await MatchDay.update({ finalized: true }, { where: { id: matchDayId } });

    return { message: 'Match ratings finalized, absentees penalized', penalizedPlayers, updatedPlayers: Object.keys(playerRatings).length };
  } catch (error) {
    console.error('finalizeMatches error:', error);
    throw error;
  }
}


module.exports = { generateSchedule, recordResult, finalizeMatches };