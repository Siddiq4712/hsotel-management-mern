import sequelize from './config/database.js';

async function checkTable() {
  try {
    const [results] = await sequelize.query("DESCRIBE tbl_Enrollment");
    console.log("tbl_Enrollment columns:");
    results.forEach(col => console.log(`- ${col.Field}: ${col.Type}`));
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await sequelize.close();
  }
}

checkTable();