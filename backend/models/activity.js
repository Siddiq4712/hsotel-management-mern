import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const ActivityOperation = sequelize.define('ActivityOperation', {
  id: { type: DataTypes.UUID, primaryKey: true },
  actor_id: { type: DataTypes.INTEGER, allowNull: false },
  actor_name: { type: DataTypes.STRING, allowNull: false },
  actor_role: { type: DataTypes.STRING(30), allowNull: false },
  workspace: { type: DataTypes.STRING(30), allowNull: false },
  module: { type: DataTypes.STRING(60), allowNull: false },
  method: { type: DataTypes.STRING(10), allowNull: false },
  path: { type: DataTypes.STRING(500), allowNull: false },
  kind: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'activity' },
  related_operation_id: { type: DataTypes.UUID, allowNull: true },
  reason: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pending' },
  http_status: { type: DataTypes.INTEGER, allowNull: true },
  change_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  search_text: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'tbl_ActivityOperation', indexes: [
  { fields: ['createdAt', 'id'] }, { fields: ['actor_id', 'createdAt'] },
  { fields: ['workspace', 'createdAt'] }, { fields: ['related_operation_id'] },
] });

export const ActivityChange = sequelize.define('ActivityChange', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  operation_id: { type: DataTypes.UUID, allowNull: false },
  model_name: { type: DataTypes.STRING(100), allowNull: false },
  record_key: { type: DataTypes.STRING(255), allowNull: false },
  primary_key: { type: DataTypes.JSON, allowNull: false },
  action: { type: DataTypes.STRING(20), allowNull: false },
  hostel_id: { type: DataTypes.INTEGER, allowNull: true },
  before_values: { type: DataTypes.JSON, allowNull: true },
  after_values: { type: DataTypes.JSON, allowNull: true },
  changed_fields: { type: DataTypes.JSON, allowNull: false },
}, { tableName: 'tbl_ActivityChange', updatedAt: false, indexes: [
  { fields: ['operation_id', 'id'] }, { fields: ['model_name', 'record_key'] },
] });

export const ActivityReversal = sequelize.define('ActivityReversal', {
  operation_id: { type: DataTypes.UUID, primaryKey: true },
  reversal_id: { type: DataTypes.UUID, allowNull: false },
  reason: { type: DataTypes.STRING(500), allowNull: false },
}, { tableName: 'tbl_ActivityReversal', updatedAt: false });

export const ActivityDelivery = sequelize.define('ActivityDelivery', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  operation_id: { type: DataTypes.UUID, allowNull: false },
  channel: { type: DataTypes.STRING(20), defaultValue: 'email', allowNull: false },
  recipient: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false },
}, { tableName: 'tbl_ActivityDelivery', updatedAt: false, indexes: [{ fields: ['operation_id'] }] });
