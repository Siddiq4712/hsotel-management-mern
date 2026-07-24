import sequelize from '../config/database.js';
import { User, Role, initAssociations } from '../models/index.js';
import jwt from 'jsonwebtoken';

const normalizeRole = (role) => {
  if (role === null || role === undefined) return null;
  const normalized = String(role).trim().toLowerCase();
  const roleMap = {
    admin: 'admin',
    administrator: 'admin',
    warden: 'warden',
    student: 'student',
    lapc: 'lapc',
    mess: 'mess',
    messstaff: 'mess',
    'mess staff': 'mess',
    parent: 'parent',
    security: 'security'
  };
  return roleMap[normalized] || normalized;
};

const run = async () => {
  try {
    initAssociations();
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjI0MjQzMTU0LCJyb2xlIjoicGFyZW50IiwiaG9zdGVsSWQiOm51bGwsImlhdCI6MTc4NDg3MTQ4OCwiZXhwIjoxNzg0OTU3ODg8fQ.Q1Fg1UPImzpfNQxtIZ_nhLdC3hN1PzxizTiA-CDlhqE';
    
    // Simulate auth middleware
    const userId = 24243154;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role', attributes: ['roleName'] }]
    });

    if (!user) {
      console.log('User not found in DB');
      return;
    }

    const roleFromToken = normalizeRole('parent');
    const roleFromUser = normalizeRole(user.role?.roleName || user.roleName);

    console.log('Comparison:', {
      roleFromToken,
      roleFromUser,
      mismatch: roleFromToken !== roleFromUser
    });
    
    if (roleFromToken && roleFromUser && roleFromToken !== roleFromUser) {
      console.log('Mismatched!');
    } else {
      console.log('Matched successfully');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
};

run();
