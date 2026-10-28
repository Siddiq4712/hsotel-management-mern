import { canCallApi } from '../../shared/permissionRoutes.js';
import { readPermissionPolicy } from '../services/permissions.js';

export const createPermissionEnforcer = (load = readPermissionPolicy) => async (req, res, next) => {
  if (req.user?.role === 'admin' || /^\/api\/(auth|permissions)(\/|$)/.test(req.originalUrl)) return next();
  try {
    const policy = await load();
    if (!canCallApi(policy.grants, req.user?.role, req.originalUrl, req.method)) {
      return res.status(403).json({ code: 'SCREEN_PERMISSION_DENIED', message: 'Your role does not have permission for this screen or action.' });
    }
    req.screenPermissions = policy;
    return next();
  } catch (error) {
    console.error('Permission lookup failed:', error.message);
    return res.status(503).json({ code: 'PERMISSIONS_UNAVAILABLE', message: 'Unable to verify permissions. Please retry.' });
  }
};
export const enforceScreenPermissions = createPermissionEnforcer();
