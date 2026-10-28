import { can, normalizePermissionRole } from './permissions.js';

// This registry is server-owned. Never use a caller-supplied screen header to authorize an API.
// Read dependencies allow the lookups needed by another enabled screen; writes never inherit them.
const readDependencies = {
  students: ['attendance', 'room-allotment', 'suspensions', 'leave-approvals', 'complaint-management', 'mess-fees', 'staff-food-consumption', 'room-requests'],
  'warden-rooms': ['room-allotment', 'room-requests'],
  inventory: ['consumption', 'purchase-orders', 'weekly-menu', 'recipes', 'menu-templates', 'inventory-reports'],
  stores: ['inventory', 'purchase-orders'],
  uoms: ['inventory', 'recipes', 'menu-templates', 'special-food-items'],
  'special-food-items': ['staff-food-consumption', 'food-orders', 'my-food'],
  'my-profile': ['my-leaves', 'my-reductions', 'my-rooms', 'my-fees', 'my-food', 'my-outpass', 'gps-attendance'],
};
const request = (screen, action, dependencies = true) => ({ any: [screen, ...(action === 'view' && dependencies ? readDependencies[screen] || [] : [])].map(id => ({ screen: id, action })) });
export function apiPermission(url, method = 'GET', role = '') {
  role = normalizePermissionRole(role);
  const path = String(url).split('?')[0].replace(/^https?:\/\/[^/]+/, '').toLowerCase().replace(/^\/api(?=\/|$)/, '').replace(/\/+$/, '') || '/';
  const [, area, resource = '', ...parts] = path.split('/');
  const read = ['GET', 'HEAD'].includes(method.toUpperCase());
  let action = read ? 'view' : ({ POST: 'create', PUT: 'edit', PATCH: 'edit', DELETE: 'delete' })[method.toUpperCase()];
  if (!action) return null;
  if (['auth', 'permissions'].includes(area)) return null; // Login/profile/password and permission bootstrap have their own guards.
  if (area === 'notifications') return request('notifications', read ? 'view' : 'edit');
  if (area === 'admin') return request('screen-permissions', action); // Existing admin guard remains authoritative.
  if (area === 'menu-planning') return request('weekly-menu', resource === 'plans' ? 'generate' : resource === 'settings' && !read ? 'edit' : action);
  if (area === 'inventories') {
    if (!read) return request('manage-inventories', action);
    if (parts.includes('reports')) {
      const format = new URLSearchParams(String(url).split('?')[1] || '').get('format');
      return request('inventory-reports', format && format !== 'preview' ? 'export' : 'view');
    }
    return { any: ['inventory', 'inventory-reports', 'consumption', 'purchase-orders', 'daily-expenses'].map(screen => ({ screen, action: 'view' })) };
  }
  if (area === 'attendance') {
    if (resource === 'summary') return { any: ['dashboard', 'gps-attendance', 'attendance'].map(screen => ({ screen, action: 'view' })) };
    return request('gps-attendance', parts.includes('close') ? 'edit' : action);
  }
  if (area === 'outpass') {
    if (['warden', 'approve', 'reject'].includes(resource)) return request('outpass-approvals', read ? 'view' : 'approve');
    if (resource === 'scan') return request('gate-scan', 'create');
    if (['today-activity', 'outside', 'recent-scans'].includes(resource)) return request('gate-activity', 'view', false);
    if (resource === 'admin') return request('outpass-logs', read ? 'view' : 'edit');
    return request('my-outpass', action);
  }
  if (area === 'parent') {
    if (resource === 'notifications') return request('notifications', read ? 'view' : 'edit');
    return request('parent-portal', action);
  }
  if (area === 'student') {
    if (resource === 'dashboard-stats' || resource === 'chart-data') return request('dashboard', 'view');
    const screens = { profile: 'my-profile', roommates: 'my-rooms', 'daily-mess-charges': 'my-fees', 'mess-bills': 'my-fees',
      'leave-requests': 'my-leaves', complaints: 'my-complaints', transactions: 'my-transactions', attendance: 'gps-attendance',
      facilities: 'my-facilities', 'facility-usage': 'my-facilities', tokens: 'my-fees', 'special-food-items': 'my-food',
      'special-food-item-categories': 'my-food', 'food-orders': 'my-food', 'hostel-layout': 'my-rooms', rooms: 'my-rooms',
      'room-types': 'my-rooms', 'room-requests': 'my-rooms', 'day-reduction-requests': 'my-reductions', rebates: 'my-rebates' };
    if (parts.includes('cancel')) action = 'delete';
    if (resource === 'day-reduction-requests' && parts.includes('status')) action = 'delete';
    return screens[resource] ? request(screens[resource], action) : { any: [] };
  }
  if (area === 'warden') {
    if (resource === 'dashboard-stats' || resource === 'daily-rate') return request('dashboard', 'view');
    if (resource === 'sessions') return { any: ['students', 'attendance', 'room-allotment', 'mess-fees'].map(screen => ({ screen, action: 'view' })) };
    const screens = { students: 'students', 'erp-sync-status': 'students', 'erp-sync-now': 'students',
      'available-rooms': 'room-allotment', 'room-allotment': 'room-allotment', rooms: 'warden-rooms', 'room-types': 'warden-rooms',
      attendance: 'attendance', 'leave-requests': 'leave-approvals', complaints: 'complaint-management', suspensions: 'suspensions',
      holidays: 'holidays', 'additional-collections': 'income-entry', 'mess-bills': 'mess-fees', layout: 'warden-rooms',
      'room-requests': 'room-requests', 'day-reduction-requests': 'warden-reductions', rebates: 'rebate-approvals' };
    if (resource === 'erp-sync-now') action = 'edit';
    if (!read && ['leave-requests', 'room-requests', 'day-reduction-requests', 'rebates'].includes(resource)) action = 'approve';
    if (parts.includes('generate')) action = 'generate';
    if (parts.includes('bulk-delete')) action = 'delete';
    if (parts.includes('bulk-preview')) action = 'create';
    if (resource === 'attendance' && !read) action = 'edit';
    if (resource === 'layout' && !read) action = 'edit';
    return screens[resource] ? request(screens[resource], action) : { any: [] };
  }
  if (area === 'mess') {
    if (['dashboard-stats', 'chart-data', 'daily-rate'].includes(resource) && read) return request('dashboard', 'view');
    if (resource === 'students' && parts.includes('bed-fees')) return request('mess-fees', action);
    if (resource === 'sessions' || resource === 'students') return { any: ['mess-fees', 'staff-food-consumption', 'food-orders'].map(screen => ({ screen, action: 'view' })) };
    const screens = { menus: 'menu-templates', 'menu-schedule': 'menu-schedule', items: 'inventory', 'item-categories': 'inventory',
      stock: 'inventory', 'inventory-purchase': 'inventory', 'inventory-transactions': 'inventory', inventory: 'inventory',
      consumption: 'consumption', 'daily-rate': 'mess-fees', 'daily-charges': 'mess-fees', 'generate-mess-bills': 'mess-fees',
      stores: 'stores', 'item-stores': 'stores', uoms: 'uoms', 'special-food-items': 'special-food-items',
      'food-orders': role === 'student' ? 'my-food' : 'food-orders',
      'daily-expenses': 'daily-expenses', 'expenses-types': 'daily-expenses', 'student-fees': 'mess-fees', 'bed-fees': 'mess-fees',
      'credit-token': 'credit-tokens', concerns: 'credit-tokens', 'income-entries': 'income-entry', 'additional-income': 'income-entry',
      'purchase-orders': 'purchase-orders', recipes: 'recipes', 'student-special-consumption-staff': 'staff-food-consumption', 'special-consumption': 'staff-food-consumption' };
    if (resource === 'reports') {
      const kind = parts[0];
      if (['mess-fee-summary', 'student-fee-breakdown'].includes(kind)) return request('mess-fees', 'view');
      if (kind === 'monthly-mess-bill') return request('mess-fees', 'view');
      if (kind === 'daily-rate-calculation') return { any: ['mess-fees', 'inventory-reports'].map(screen => ({ screen, action: 'view' })) };
      if (['monthly-food-orders', 'additional-food-students'].includes(kind)) return request('food-orders', 'view');
      return request('inventory-reports', 'export');
    }
    if (resource === 'inventory' && parts.includes('correct-last-purchase')) action = 'edit';
    if (parts.some(p => p.startsWith('export-'))) action = 'export';
    if (resource === 'daily-charges' || resource === 'generate-mess-bills' || resource === 'daily-rate' && !read) action = 'generate';
    if (parts.includes('cancel')) action = 'delete';
    return screens[resource] ? request(screens[resource], action) : { any: [] };
  }
  return null;
}
export function canCallApi(grants, role, url, method) {
  if (normalizePermissionRole(role) === 'admin') return true;
  const rule = apiPermission(url, method, role);
  return rule === null || rule.any.some(({ screen, action }) => can(grants, role, screen, action));
}
