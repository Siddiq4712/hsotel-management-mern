import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

export async function up() {
  try {
    // Add google_id column to tbl_users if it doesn't exist
    await sequelize.query(`
      ALTER TABLE tbl_users
      ADD COLUMN google_id VARCHAR(255) NULL UNIQUE;
    `, { type: QueryTypes.RAW });
    console.log('✓ Successfully added google_id column to tbl_users');
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('✓ Column google_id already exists');
    } else {
      console.error('✗ Error adding google_id column:', error.message);
      throw error;
    }
  }

  try {
    // Add profile_picture column to tbl_users if it doesn't exist
    await sequelize.query(`
      ALTER TABLE tbl_users
      ADD COLUMN profile_picture TEXT NULL;
    `, { type: QueryTypes.RAW });
    console.log('✓ Successfully added profile_picture column to tbl_users');
  } catch (error) {
    if (error.message.includes('Duplicate column')) {
      console.log('✓ Column profile_picture already exists');
    } else {
      console.error('✗ Error adding profile_picture column:', error.message);
      throw error;
    }
  }
}

export async function down() {
  try {
    await sequelize.query(`
      ALTER TABLE tbl_users
      DROP COLUMN google_id;
    `, { type: QueryTypes.RAW });
    console.log('✓ Successfully removed google_id column from tbl_users');
  } catch (error) {
    console.error('✗ Error removing google_id column:', error.message);
  }

  try {
    await sequelize.query(`
      ALTER TABLE tbl_users
      DROP COLUMN profile_picture;
    `, { type: QueryTypes.RAW });
    console.log('✓ Successfully removed profile_picture column from tbl_users');
  } catch (error) {
    console.error('✗ Error removing profile_picture column:', error.message);
  }
}
