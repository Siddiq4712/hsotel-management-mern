// LAPC is a legacy account-role alias. College affiliation is stored separately.
const aliases = { administrator: 'admin', lapc: 'student', messstaff: 'mess', 'mess staff': 'mess' };
export function normalizeRole(value) {
  if (value === null || value === undefined) return null;
  const raw = typeof value === 'object' ? value.roleName ?? value.name ?? value.role : value;
  const role = String(raw ?? '').trim().toLowerCase();
  if (!role) return null;
  return Object.prototype.hasOwnProperty.call(aliases, role) ? aliases[role] : role;
}
