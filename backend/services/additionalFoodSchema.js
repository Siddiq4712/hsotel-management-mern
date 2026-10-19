import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';
import { SpecialFoodItem, StudentFee, FoodOrder, FoodOrderItem } from '../models/index.js';

export async function ensureAdditionalFoodSchema() {
  await SpecialFoodItem.sync();
  const query = sequelize.getQueryInterface();
  const columns = await query.describeTable(SpecialFoodItem.getTableName());
  if (!columns.max_quantity_per_student) await query.addColumn(SpecialFoodItem.getTableName(), 'max_quantity_per_student', { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 });
  if (!columns.meal_type) await query.addColumn(SpecialFoodItem.getTableName(), 'meal_type', { type: DataTypes.STRING, allowNull: true });
  await migrateAdditionalFoodClassification();
  if (!columns.weekly_day) await query.addColumn(SpecialFoodItem.getTableName(), 'weekly_day', {
    type: DataTypes.INTEGER, allowNull: true,
  });
  if (!columns.order_deadline_time) await query.addColumn(SpecialFoodItem.getTableName(), 'order_deadline_time', {
    type: DataTypes.STRING(5), allowNull: false, defaultValue: '19:00',
  });
  await StudentFee.sync();
  const feeColumns = await query.describeTable(StudentFee.getTableName());
  if (!feeColumns.food_order_id) await query.addColumn(StudentFee.getTableName(), 'food_order_id', { type: DataTypes.INTEGER, allowNull: true });
  const indexes = await query.showIndex(StudentFee.getTableName());
  if (!indexes.some(index => index.unique && index.fields.length === 1 && index.fields[0].attribute === 'food_order_id')) {
    await query.addIndex(StudentFee.getTableName(), ['food_order_id'], { unique: true, name: 'student_fee_food_order_unique' });
  }
  for (const [model, additions] of [[FoodOrder, { order_source: { type: DataTypes.STRING(16), allowNull: true } }],
    [FoodOrderItem, { food_name_snapshot: { type: DataTypes.STRING, allowNull: true }, category_snapshot: { type: DataTypes.STRING, allowNull: true }, meal_type_snapshot: { type: DataTypes.STRING, allowNull: true } }]]) {
    await model.sync();
    const existing = await query.describeTable(model.getTableName());
    for (const [name, definition] of Object.entries(additions)) if (!existing[name]) await query.addColumn(model.getTableName(), name, definition);
  }
}

export async function migrateAdditionalFoodClassification(transaction) {
  // Preserve the old meal assignment without guessing a dietary category.
  await SpecialFoodItem.update({ meal_type: sequelize.col('category'), category: 'Unspecified' }, {
    where: { meal_type: null, category: { [Op.in]: ['Breakfast', 'Lunch', 'Dinner'] } }, transaction,
  });
}
