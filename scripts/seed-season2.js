const db = require('../config/db');
const Season = require('../models/Season');
const Player = require('../models/Player');
const MatchDay = require('../models/MatchDay');

const mbpl2Players = [
  { rank: 1, name: 'Vishnu Sarda' },
  { rank: 2, name: 'Ashutosh Laddha' },
  { rank: 3, name: 'Dr Srigopal Bhandari' },
  { rank: 4, name: 'Ankesh Somani' },
  { rank: 5, name: 'Amar Toshniwal' },
  { rank: 6, name: 'Sarveshwar Lakhotiya' },
  { rank: 7, name: 'Mayur Toshniwal' },
  { rank: 8, name: 'Mahesh Loya' },
  { rank: 9, name: 'Mahesh Rathi' },
  { rank: 10, name: 'Vivek Bajaj' },
  { rank: 11, name: 'Nikunj Mohota' },
  { rank: 12, name: 'Shubham Soni' },
  { rank: 13, name: 'Rohit Mohta' },
  { rank: 14, name: 'Aseem Maru' },
  { rank: 15, name: 'Ankit Mantri' },
  { rank: 16, name: 'Pushkar Bang' },
  { rank: 17, name: 'Manish Mundada' },
  { rank: 18, name: 'Bhushan Ladda' },
  { rank: 19, name: 'Navin Maheshwari' },
  { rank: 20, name: 'Bharat Jhawar' },
  { rank: 21, name: 'Arun Modani' },
  { rank: 22, name: 'Shubham Nuwal' },
  { rank: 23, name: 'Ramanuj Maheshwari' },
  { rank: 24, name: 'Sanjay Mundra' },
  { rank: 25, name: 'Vrisha Bhutada(Smita)' },
  { rank: 26, name: 'Pawan Falor' },
  { rank: 27, name: 'Ronak Somani' },
  { rank: 28, name: 'Hrishikesh Malu' },
  { rank: 29, name: 'Ramesh Soni' },
  { rank: 30, name: 'Mahesh Jaju' },
  { rank: 31, name: 'Shraddha Jaju' },
  { rank: 32, name: 'Uday Dangra' },
  { rank: 33, name: 'Nitu Samdani' },
  { rank: 34, name: 'Kiran Zanwar' },
  { rank: 35, name: 'Pushkar Mundada' },
  { rank: 36, name: 'Nidhi Malpani' },
  { rank: 37, name: 'Shrikant Porwal' },
  { rank: 38, name: 'Shikha Mohta' },
  { rank: 39, name: 'Palak Rathi' },
  { rank: 40, name: 'Priyul Maheshwari' },
  { rank: 41, name: 'Siya Mundada' },
  { rank: 42, name: 'Somesh Bhutada' },
  { rank: 43, name: 'Nirbhay Sarda' },
  { rank: 44, name: 'Pratiksha Sarda' },
  { rank: 45, name: 'Megha Maru' },
  { rank: 46, name: 'Shraddha Mundada' },
  { rank: 47, name: 'Arti Loya' },
  { rank: 48, name: 'Sharda Jhawar' },
  { rank: 49, name: 'Vandana Lakhotiya' },
  { rank: 50, name: 'Rajas Bajaj' },
  { rank: 51, name: 'Snehal Manish Mundada' },
  { rank: 52, name: 'Lavanya Falor' },
  { rank: 53, name: 'Snehal Rathi' },
  { rank: 54, name: 'Swati Jaju' },
  { rank: 55, name: 'Aarya Maru' },
  { rank: 56, name: 'Radhika Mohota' },
  { rank: 57, name: 'Mayra Mohta' }
];

async function seedSeason2() {
  console.log('🔄 Initializing MBPL 2.0 (Season 2) with Rank-based starting ratings (Rank 1=900, Rank 2=890...)...');
  await db.sync({ alter: true });

  // Create Season 1 & Season 2
  const [s1] = await Season.findOrCreate({ where: { id: 1 }, defaults: { name: 'MBPL Season 1.0', isActive: false } });
  const [s2] = await Season.findOrCreate({ where: { id: 2 }, defaults: { name: 'MBPL Season 2.0', startDate: '2026-07-12', isActive: true } });

  console.log('✅ Seasons active: Season 1 =', s1.name, '| Season 2 =', s2.name);

  // Set SeasonId = 1 for historical matchdays
  await MatchDay.update({ SeasonId: 1 }, { where: { SeasonId: null } });

  // Delete any existing Season 2 players before re-seeding
  await Player.destroy({ where: { SeasonId: 2 } });

  // Calculate rating based on rank: Rank 1 = 900, Rank 2 = 890, Rank 3 = 880...
  const playersToCreate = mbpl2Players.map(p => {
    const calculatedRating = 900 - ((p.rank - 1) * 10);
    return {
      name: p.name,
      rank: p.rank,
      initialRating: calculatedRating,
      currentRating: calculatedRating,
      SeasonId: 2,
      joiningDate: '2026-07-12',
      gender: 'M',
      present: false
    };
  });

  const created = await Player.bulkCreate(playersToCreate);

  // Reset sequence
  const resetSequences = require('./reset-sequences');
  await resetSequences();

  console.log(`🎉 Successfully seeded ${created.length} MBPL 2.0 players with rank-based ratings (900 to ${900 - (56 * 10)})!`);
}

if (require.main === module) {
  seedSeason2().then(() => process.exit(0)).catch(err => {
    console.error('❌ Error seeding Season 2:', err);
    process.exit(1);
  });
}

module.exports = seedSeason2;
