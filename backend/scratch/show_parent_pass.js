import sequelize from '../config/database.js';
import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';

const run = async () => {
  try {
    const parent = await User.findByPk(24243154);
    if (!parent) {
      console.log('Parent not found');
      return;
    }
    
    // Reset password to '123456' so they can test change password successfully
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);
    await parent.update({ password: hashedPassword });
    console.log('Password reset successfully for par (par@gmail.com) to: 123456');
  } catch (error) {
    console.error(error);
  } finally {
    await sequelize.close();
  }
};

run();
