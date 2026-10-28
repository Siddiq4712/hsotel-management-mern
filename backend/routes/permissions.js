import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { User, Role } from '../models/index.js';
import { PermissionHistory } from '../models/permissions.js';
import { readPermissionPolicy, savePermissionPolicy } from '../services/permissions.js';
import { SCREENS, ROLE_LABELS, normalizePermissionRole } from '../../shared/permissions.js';

const router = express.Router();
router.use(auth);
const endpoint = fn => async (req, res) => {
  try { res.json({ success: true, data: await fn(req) }); }
  catch (error) { res.status(error.status || 503).json({ message: error.status ? error.message : 'Permission settings are unavailable. Please retry.' }); }
};
router.get('/mine', endpoint(async req => {
  const policy = await readPermissionPolicy();
  return { revision: policy.revision, grants: { [req.user.role]: policy.grants[req.user.role] || {} }, role: req.user.role };
}));
router.use(authorize(['admin']));
router.get('/', endpoint(async () => {
  const policy = await readPermissionPolicy();
  const counts = Object.fromEntries(Object.keys(ROLE_LABELS).map(role => [role, 0]));
  const roles = await Role.findAll({ attributes: ['roleId', 'roleName'], raw: true });
  for (const role of roles) {
    const key = normalizePermissionRole(role.roleName);
    if (key in counts) counts[key] += await User.count({ where: { roleId: role.roleId, status: true } });
  }
  return { ...policy, screens: SCREENS, roles: ROLE_LABELS, counts };
}));
router.put('/', endpoint(req => savePermissionPolicy(req.body, req.user)));
router.get('/history', endpoint(async req => {
  const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
  return PermissionHistory.findAndCountAll({ limit: 20, offset: (Math.floor(page) - 1) * 20, order: [['revision', 'DESC']] });
}));
export default router;
