import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

export async function up() {
  const transaction = await sequelize.transaction();
  try {
    // 1. Add parent_approval_required to tbl_Hostel
    await sequelize.query(`
      ALTER TABLE tbl_Hostel
      ADD COLUMN parent_approval_required TINYINT(1) NOT NULL DEFAULT 0;
    `, { type: QueryTypes.RAW, transaction });

    // 2. Create tbl_ParentStudent
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tbl_ParentStudent (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_id INT NOT NULL,
        student_id INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_parent_student (parent_id, student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `, { type: QueryTypes.RAW, transaction });

    // 3. Create tbl_Outpass
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tbl_Outpass (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        hostel_id INT NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        from_date DATETIME NOT NULL,
        to_date DATETIME NOT NULL,
        exit_time DATETIME NULL,
        return_time DATETIME NULL,
        status ENUM('pending', 'approved', 'rejected', 'cancelled', 'outside', 'completed', 'expired', 'late_return') NOT NULL DEFAULT 'pending',
        qr_token VARCHAR(255) NULL UNIQUE,
        approved_by INT NULL,
        approved_date DATETIME NULL,
        remarks TEXT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (student_id) REFERENCES tbl_users(id) ON DELETE CASCADE,
        FOREIGN KEY (hostel_id) REFERENCES tbl_Hostel(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES tbl_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `, { type: QueryTypes.RAW, transaction });

    // 4. Create tbl_HostelNotice
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tbl_HostelNotice (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hostel_id INT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_by INT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (hostel_id) REFERENCES tbl_Hostel(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES tbl_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `, { type: QueryTypes.RAW, transaction });

    // 5. Create tbl_InAppNotification
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tbl_InAppNotification (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        status ENUM('unread', 'read') NOT NULL DEFAULT 'unread',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES tbl_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `, { type: QueryTypes.RAW, transaction });

    await transaction.commit();
    console.log('✓ Successfully executed all migration queries.');
  } catch (error) {
    await transaction.rollback();
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
}

export async function down() {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(`DROP TABLE IF EXISTS tbl_InAppNotification;`, { type: QueryTypes.RAW, transaction });
    await sequelize.query(`DROP TABLE IF EXISTS tbl_HostelNotice;`, { type: QueryTypes.RAW, transaction });
    await sequelize.query(`DROP TABLE IF EXISTS tbl_Outpass;`, { type: QueryTypes.RAW, transaction });
    await sequelize.query(`DROP TABLE IF EXISTS tbl_ParentStudent;`, { type: QueryTypes.RAW, transaction });
    await sequelize.query(`ALTER TABLE tbl_Hostel DROP COLUMN parent_approval_required;`, { type: QueryTypes.RAW, transaction });
    await transaction.commit();
    console.log('✓ Successfully rolled back migration queries.');
  } catch (error) {
    await transaction.rollback();
    console.error('✗ Migration rollback failed:', error.message);
  }
}
