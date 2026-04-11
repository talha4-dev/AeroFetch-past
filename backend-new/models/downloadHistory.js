const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DownloadHistory = sequelize.define('DownloadHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  thumbnail: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  platform: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  quality: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  format: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  file_size: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  duration: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'completed'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'download_history',
  timestamps: false,
});

module.exports = DownloadHistory;
