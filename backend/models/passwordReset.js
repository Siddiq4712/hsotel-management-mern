import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Separate table: no changes to existing student/import credentials.
export const PasswordReset = sequelize.define('PasswordReset', {
  userId: { type: DataTypes.INTEGER, primaryKey: true },
  otpHash: { type: DataTypes.STRING(64), allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  tokenHash: { type: DataTypes.STRING(64), allowNull: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false },
}, { tableName: 'password_resets', timestamps: true });
