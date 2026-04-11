const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true // Nullable for Google Auth users
  },
  google_id: {
    type: DataTypes.STRING(120),
    unique: true,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  picture: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false, // Legacy fallback, handled by created_at explicitly
});

// Methods matching the Python behavior
User.prototype.checkPassword = async function(password) {
  if (!this.password_hash) return false;
  return await bcrypt.compare(password, this.password_hash);
};

User.prototype.toDict = async function() {
  const downloadCount = await this.countDownloadHistories();
  return {
    id: this.id,
    email: this.email,
    name: this.name || this.email.split('@')[0],
    created_at: this.created_at.toISOString(),
    download_count: downloadCount
  };
};

module.exports = User;
