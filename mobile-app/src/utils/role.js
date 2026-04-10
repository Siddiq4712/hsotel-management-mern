const ROLE_ALIASES = {
  admin: 'admin',
  administrator: 'admin',
  warden: 'warden',
  student: 'student',
  lapc: 'student',
  mess: 'mess',
  messstaff: 'mess',
  'mess staff': 'mess'
};

const extractRoleValue = (value) => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'object') {
    return (
      value.roleName ??
      value.role ??
      value.name ??
      value.value ??
      null
    );
  }

  return value;
};

export const normalizeRole = (value) => {
  const extracted = extractRoleValue(value);
  if (extracted === null || extracted === undefined) return null;

  const raw = String(extracted).trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes('warden')) return 'warden';
  if (raw.includes('admin')) return 'admin';
  if (raw.includes('mess')) return 'mess';
  if (raw.includes('student') || raw === 'lapc') return 'student';

  return ROLE_ALIASES[raw] || raw;
};
