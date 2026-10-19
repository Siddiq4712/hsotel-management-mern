export function canAccessRole(role, allowed) {
  return allowed.includes(role) || (role === 'admin' && allowed.some(value => value === 'warden' || value === 'mess'));
}
