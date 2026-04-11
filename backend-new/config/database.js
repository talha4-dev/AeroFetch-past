const { Sequelize } = require('sequelize');
require('dotenv').config();

// Determine database environment
const isProduction = process.env.NODE_ENV === 'production';

let sequelize;

if (isProduction) {
  // Use MySQL for production as requested
  sequelize = new Sequelize(
    process.env.DB_NAME || 'aerofetch_prod',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'mysql',
      logging: false, // disable logging in prod
    }
  );
} else {
  // Use SQLite for dev/fallback
  const path = require('path');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../backend/instance/aerofetch.db.backup'),
    logging: false
  });
}

module.exports = sequelize;
