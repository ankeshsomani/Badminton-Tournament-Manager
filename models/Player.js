const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Player = sequelize.define('Player', {
  name: { type: DataTypes.STRING, allowNull: false },
  initialRating: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
  currentRating: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
  joiningDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  gender: { type: DataTypes.ENUM('M','F'), defaultValue: 'M' },
  present: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastRatingUpdatedOn: { type: DataTypes.DATE, allowNull: true },
  SeasonId: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  rank: { type: DataTypes.INTEGER, allowNull: true },
});

module.exports = Player;