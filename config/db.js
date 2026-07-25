const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL) {
  // Connection string format (Supabase, Neon, Render, Cloud Run, etc.)
  const isPostgres = process.env.DATABASE_URL.startsWith('postgres') || process.env.DATABASE_URL.startsWith('postgresql');
  const enableSsl = process.env.DB_SSL !== 'false'; // Default to SSL enabled for remote DB connections

  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: isPostgres ? 'postgres' : 'mysql',
    logging: false,
    dialectOptions: enableSsl && isPostgres
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });
} else {
  // Separate environment parameters fallback
  const dialect = process.env.DB_DIALECT || 'postgres';
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  const enableSsl = process.env.DB_SSL === 'true';

  sequelize = new Sequelize({
    dialect: dialect,
    host: host,
    port: process.env.DB_PORT || process.env.MYSQL_PORT || (dialect === 'postgres' ? 5432 : 3306),
    username: process.env.DB_USER || process.env.MYSQL_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'badminton_tournament',
    logging: false,
    dialectOptions: enableSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  });
}

module.exports = sequelize;