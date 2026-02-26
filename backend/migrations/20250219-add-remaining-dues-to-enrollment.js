import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

export async function up() {
  try {
    // Add remaining_dues column to tbl_Enrollment if it doesn't exist
    await sequelize.query(`
      ALTER TABLE tbl_Enrollment
      ADD COLUMN remaining_dues INT DEFAULT 0;
    `, { type: QueryTypes.RAW });
    console.log('✓ Successfully added remaining_dues column to tbl_Enrollment');
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('✓ Column remaining_dues already exists');
    } else {
      console.error('✗ Error adding remaining_dues column:', error.message);
      throw error;
    }
  }
}

export async function down() {
  try {
    await sequelize.query(`
      ALTER TABLE tbl_Enrollment
      DROP COLUMN remaining_dues;
    `, { type: QueryTypes.RAW });
    console.log('✓ Successfully removed remaining_dues column from tbl_Enrollment');
  } catch (error) {
    console.error('✗ Error removing remaining_dues column:', error.message);
  }
}
