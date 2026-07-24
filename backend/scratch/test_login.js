import sequelize from '../config/database.js';
import { User, Role } from '../models/index.js';
import bcrypt from 'bcryptjs';

const run = async () => {
  try {
    const user = await User.findOne({
      where: { userName: 'par' }
    });
    
    if (!user) {
      console.log('User par not found');
      return;
    }
    
    const isMatch = await bcrypt.compare('parent123', user.password);
    console.log('Testing login for "par":');
    console.log('- User found:', user.userName);
    console.log('- Password hash in DB:', user.password);
    console.log('- Compare with "parent123":', isMatch);
  } catch (error) {
    console.error(error);
  } finally {
    await sequelize.close();
  }
};

run();
