const sequelize = require('../config/database');
const User = require('./user');
const DownloadHistory = require('./downloadHistory');

// Set up associations
User.hasMany(DownloadHistory, { foreignKey: 'user_id', as: 'downloadHistories' });
DownloadHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  DownloadHistory
};
