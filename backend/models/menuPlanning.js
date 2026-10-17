import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const id = { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true };
const hostel = { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } };

export const MenuPlanningSettings = sequelize.define('MenuPlanningSettings', {
  hostel_id: { ...hostel, primaryKey: true },
  configuration: { type: DataTypes.JSON, allowNull: false },
  revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
}, { tableName: 'menu_planning_settings' });

// Published versions are immutable. A later effective date supersedes a regular plan.
export const WeeklyMenuPlan = sequelize.define('WeeklyMenuPlan', {
  id, hostel_id: hostel,
  name: { type: DataTypes.STRING(120), allowNull: false },
  kind: { type: DataTypes.ENUM('regular', 'temporary'), allowNull: false },
  effective_from: { type: DataTypes.DATEONLY, allowNull: false },
  effective_to: { type: DataTypes.DATEONLY },
  default_count: { type: DataTypes.INTEGER, allowNull: false },
  slots: { type: DataTypes.JSON, allowNull: false },
  meals: { type: DataTypes.JSON, allowNull: false },
  created_by: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'weekly_menu_plans', indexes: [
  { name: 'weekly_menu_plan_dates', fields: ['hostel_id', 'kind', 'effective_from'] }
] });

export const PlannedDailyMeal = sequelize.define('PlannedDailyMeal', {
  id, hostel_id: hostel,
  date: { type: DataTypes.DATEONLY, allowNull: false },
  slot_key: { type: DataTypes.STRING(40), allowNull: false },
  snapshot: { type: DataTypes.JSON, allowNull: false },
  status: { type: DataTypes.ENUM('planned', 'served', 'skipped'), defaultValue: 'planned', allowNull: false },
  revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  actual_consumption: { type: DataTypes.JSON },
  total_cost: { type: DataTypes.DECIMAL(12, 2) },
  recorded_by: { type: DataTypes.INTEGER }
}, { tableName: 'planned_daily_meals', indexes: [
  { unique: true, fields: ['hostel_id', 'date', 'slot_key'] }
] });

export const MenuPlanningChange = sequelize.define('MenuPlanningChange', {
  id, hostel_id: hostel,
  actor_id: { type: DataTypes.INTEGER, allowNull: false },
  actor_name: { type: DataTypes.STRING(255), allowNull: false },
  action: { type: DataTypes.STRING(50), allowNull: false },
  reason: { type: DataTypes.STRING(500), allowNull: false },
  details: { type: DataTypes.JSON, allowNull: false }
}, { tableName: 'menu_planning_changes' });
