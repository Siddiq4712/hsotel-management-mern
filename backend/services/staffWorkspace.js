import { Op } from 'sequelize';
import { User, Role, Hostel, Inventory, InventoryHostel } from '../models/index.js';
import { normalizeRole } from '../../shared/roles.js';

const staffRoles = ['warden', 'mess'];
const attributes = ['userId', 'userName', 'hostel_id'];
const includedAssignments = [
  { model: Role, as: 'role', attributes: ['roleName'], required: true },
  { model: Hostel, attributes: ['id', 'name'], where: { is_active: true }, required: true },
];

async function workspaceFor(user) {
  const role = normalizeRole(user?.role?.roleName);
  if (!staffRoles.includes(role) || !user.Hostel) return null;
  const assignment = role === 'mess' ? await InventoryHostel.findByPk(user.Hostel.id) : null;
  const inventory = assignment ? await Inventory.findByPk(assignment.inventory_id, { attributes: ['id', 'name'] }) : null;
  return { id: user.userId, name: user.userName, role, hostel: user.Hostel, inventory };
}

export async function resolveStaffWorkspace(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return workspaceFor(await User.findOne({ where: { userId: id, status: 'Active' }, attributes, include: includedAssignments }));
}

export async function listStaffWorkspaces(req, res) {
  try {
    const roles = await Role.findAll({ attributes: ['roleId', 'roleName'] });
    const roleIds = roles.filter(role => staffRoles.includes(normalizeRole(role.roleName))).map(role => role.roleId);
    const users = await User.findAll({ where: { status: 'Active', roleId: { [Op.in]: roleIds } }, attributes,
      include: includedAssignments, order: [['userName', 'ASC'], ['userId', 'ASC']] });
    const workspaces = await Promise.all(users.map(workspaceFor));
    return res.json({ success: true, data: workspaces.filter(Boolean) });
  } catch (error) {
    console.error('Staff workspace listing failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load staff workspaces.' });
  }
}
