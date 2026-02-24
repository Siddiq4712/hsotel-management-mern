import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

export async function up() {
  try {
    // Add expiry_time column to tbl_SpecialFoodItem if it doesn't exist
    await sequelize.query(`
      ALTER TABLE tbl_SpecialFoodItem
      ADD COLUMN expiry_time DATETIME NULL COMMENT 'Optional expiry time for ordering deadline';
    `, { type: QueryTypes.RAW });
    console.log('✓ Successfully added expiry_time column to tbl_SpecialFoodItem');
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('✓ Column expiry_time already exists');
    } else {
      console.error('✗ Error adding expiry_time column:', error.message);
      throw error;
    }
  }
}

export async function down() {
  try {
    await sequelize.query(`
      ALTER TABLE tbl_SpecialFoodItem
      DROP COLUMN expiry_time;
    `, { type: QueryTypes.RAW });
    console.log('✓ Successfully removed expiry_time column from tbl_SpecialFoodItem');
  } catch (error) {
    console.error('✗ Error removing expiry_time column:', error.message);
  }
}