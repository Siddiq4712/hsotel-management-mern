import sequelize from '../config/database.js';
import { User, Role, initAssociations } from '../models/index.js';

const run = async () => {
  try {
    initAssociations();
    const parentRole = await Role.findOne({ where: { roleName: 'Parent' } });
    if (!parentRole) {
      console.log('Parent role not found');
      return;
    }
    const parent = await User.findOne({
      where: { roleId: parentRole.roleId },
      include: [{ model: Role, as: 'role' }]
    });
    if (!parent) {
      console.log('No parent user found in DB');
    } else {
      console.log('Found Parent User:', {
        userId: parent.userId,
        userName: parent.userName,
        userMail: parent.userMail,
        roleId: parent.roleId,
        roleName: parent.role?.roleName
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
};

run();
