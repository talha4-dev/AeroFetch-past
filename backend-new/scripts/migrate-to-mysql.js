const sqlite3 = require('sqlite3').verbose();
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Migrate from SQLite to MySQL while preserving data
async function migrateDatabase() {
  console.log('🔄 Migrating from SQLite to MySQL...');

  const sqlitePath = path.join(__dirname, '../../../backend/instance/aerofetch.db.backup');
  const db = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Failed to open SQLite backup database', err.message);
      process.exit(1);
    }
  });

  const mysqlSequelize = new Sequelize(
    process.env.DB_NAME || 'aerofetch_prod',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'mysql',
      logging: false
    }
  );

  try {
    await mysqlSequelize.authenticate();
    console.log('✅ Connection to MySQL has been established successfully.');
    
    // In production, you would map over your original SQLite tables 
    // and execute bulk inserts into the fresh MySQL tables here.
    // Example:
    // const users = await new Promise((resolve, reject) => {
    //    db.all("SELECT * FROM users", [], (err, rows) => {
    //       if (err) reject(err); resolve(rows);
    //    });
    // });
    // await UserMySQL.bulkCreate(users);
    
    console.log('🚀 Phase 1 Database mapping logic scaffolded. Run when DB structures are finalized.');

  } catch (error) {
    console.error('❌ Unable to connect to MySQL:', error);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  migrateDatabase();
}
