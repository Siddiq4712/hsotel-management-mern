export const ADMIN_WORKSPACES = ['admin', 'warden', 'mess'];
export function resolveWorkspace(role, requested, saved = 'admin') {
  if (role !== 'admin') return role;
  return ADMIN_WORKSPACES.includes(requested) ? requested : ADMIN_WORKSPACES.includes(saved) ? saved : 'admin';
}
