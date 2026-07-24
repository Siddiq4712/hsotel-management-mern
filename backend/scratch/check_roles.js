import sequelize from '../config/database.js';
import { User, Role, initAssociations, ParentStudent } from '../models/index.js';

const run = async () => {
  try {
    initAssociations();
    const roles = await Role.findAll();
    console.log('--- ALL ROLES ---');
    roles.forEach(r => console.log(`ID: ${r.roleId}, Name: ${r.roleName}, Status: ${r.status}`));

    const users = await User.findAll({
      include: [{ model: Role, as: 'role', attributes: ['roleName'], required: false }]
    });

    console.log('\n--- PARENT / SECURITY USERS ---');
    const parentSecurityUsers = users.filter(u => {
      const r = (u.role?.roleName || '').toLowerCase();
      return r.includes('parent') || r.includes('security');
    });

    for (const u of parentSecurityUsers) {
      console.log(`ID: ${u.userId}, Username: ${u.userName}, Email: ${u.userMail}, Role: ${u.role?.roleName}`);
      if (u.role?.roleName.toLowerCase() === 'parent') {
        const links = await ParentStudent.findAll({ where: { parent_id: u.userId } });
        console.log(`  Linked students count: ${links.length}`);
        links.forEach(l => console.log(`    Linked to Student ID: ${l.student_id}`));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
};

run();
