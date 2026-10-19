import { Op, fn, col, where } from 'sequelize';
import { User, Role, Hostel } from '../models/index.js';

const staffRoles = ['warden', 'mess', 'messstaff', 'mess staff'];
const isStaff = role => staffRoles.includes(String(role || '').trim().toLowerCase());

export const getStaffAccess = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { status: true },
      attributes: ['userId', 'userName', 'userMail', 'roleId', 'hostel_id'],
      include: [
        { model: Role, as: 'role', required: true, where: where(fn('LOWER', col('role.roleName')), { [Op.in]: staffRoles }) },
        { model: Hostel, attributes: ['id', 'name'], required: false }
      ],
      order: [['userName', 'ASC']]
    });
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('Staff access fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load staff access settings.' });
  }
};

export const updateStaffAccess = async (req, res) => {
  try {
    const { roleId, hostel_id } = req.body;
    if (![req.params.id, roleId, hostel_id].every(value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0)) {
      return res.status(400).json({ success: false, message: 'Select a valid staff member, role and hostel.' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Staff member not found.' });
    const currentRole = await Role.findByPk(user.roleId);
    const targetRole = await Role.findByPk(roleId);
    if (!isStaff(currentRole?.roleName) || !isStaff(targetRole?.roleName)) {
      return res.status(400).json({ success: false, message: 'These settings only support warden and mess staff roles.' });
    }
    const hostel = await Hostel.findByPk(hostel_id);
    if (!hostel || !hostel.is_active) return res.status(400).json({ success: false, message: 'Choose an active hostel.' });
    await user.update({ roleId: Number(roleId), hostel_id: Number(hostel_id) });
    return res.json({ success: true, message: 'Staff access updated. The new assignment applies to subsequent requests.' });
  } catch (error) {
    console.error('Staff access update failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to update staff access.' });
  }
};
