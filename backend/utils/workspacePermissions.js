import { normalizeRole } from '../../shared/roles.js';

export function canAccessRole(role, allowed) {
  const resolvedRole = normalizeRole(role);
  const resolvedAllowed = allowed.map(normalizeRole);
  return resolvedAllowed.includes(resolvedRole) || (resolvedRole === 'admin' && resolvedAllowed.some(value => value === 'warden' || value === 'mess'));
}
