// Shared by the API, web app and mobile app. IDs describe capabilities, not URLs.
import { normalizeRole } from './roles.js';
export const ROLE_LABELS = { admin: 'Admin', warden: 'Warden', mess: 'Mess', student: 'Student', parent: 'Parent', security: 'Security' };
export const ACTION_LABELS = { view: 'View', create: 'Add / submit', edit: 'Edit', delete: 'Delete / cancel', approve: 'Approve / decide', export: 'Export / print', generate: 'Generate / publish' };
export const normalizePermissionRole = normalizeRole;
const crud = ['view', 'create', 'edit', 'delete'];
const students = ['student'];
const screen = (id, label, group, roles, actions = ['view'], views = [], note = '') => ({ id, label, group, roles: ['admin', ...roles.filter(r => r !== 'admin')], actions, views, note });
export const SCREENS = [
  screen('dashboard', 'Dashboard', 'General', ['warden', 'mess', ...students, 'parent', 'security'], ['view'], ['dashboard']),
  screen('notifications', 'Notifications', 'General', ['warden', 'mess', ...students, 'parent', 'security'], ['view', 'edit']),
  screen('screen-permissions', 'Screen Permissions', 'Administration', [], ['view', 'edit'], ['screen-permissions']),
  screen('activity-logs', 'Activity Logs', 'Administration', [], ['view', 'edit', 'delete'], ['activity-logs']),
  screen('hostels', 'Manage Hostels', 'Administration', [], crud, ['hostels', 'create-hostel']),
  screen('users', 'Create / Manage Users', 'Administration', [], crud, ['create-user']),
  screen('staff-access', 'Staff Access Settings', 'Administration', [], ['view', 'edit'], ['staff-access']),
  screen('sessions', 'Manage Batches', 'Administration', [], crud, ['sessions']),
  screen('monthly-attendance-import', 'Monthly Attendance Import', 'Administration', [], ['view', 'create'], ['monthly-attendance-import']),
  screen('admin-rooms', 'Manage Rooms (Admin)', 'Administration', [], crud, ['room-management']),
  screen('facility-types', 'Facility Types', 'Administration', [], crud, ['facility-types']),
  screen('admin-facilities', 'Manage Facilities', 'Administration', [], crud, ['facilities']),
  screen('maintenance', 'Maintenance', 'Administration', [], crud, ['maintenance']),
  screen('income-types', 'Income Types', 'Administration', [], crud, ['income-types']),
  screen('expense-types', 'Expense Types', 'Administration', [], crud, ['expense-types']),
  screen('admin-reductions', 'Mess Reductions (Admin)', 'Administration', [], ['view', 'approve'], ['days-reduc']),
  screen('outpass-logs', 'Outpass Logs (Admin)', 'Administration', [], ['view', 'edit'], ['outpass-logs']),
  screen('students', 'Manage / Enroll Students', 'Students', ['warden'], [...crud, 'export'], ['students', 'enroll-student'], 'Enrollment and the student directory share student records and permissions.'),
  screen('attendance', 'Attendance', 'Students', ['warden'], ['view', 'edit', 'export'], ['attendance']),
  screen('gps-attendance', 'GPS Attendance', 'Students', ['warden', ...students], ['view', 'create', 'edit']),
  screen('leave-approvals', 'Leave Requests', 'Students', ['warden'], ['view', 'approve'], ['leave-requests']),
  screen('complaint-management', 'Complaints', 'Students', ['warden'], ['view', 'edit'], ['complaints']),
  screen('suspensions', 'Suspensions', 'Students', ['warden'], ['view', 'create', 'edit'], ['suspensions']),
  screen('holidays', 'Holidays', 'Students', ['warden'], crud, ['holidays']),
  screen('warden-reductions', 'Mess Reductions (Warden)', 'Students', ['warden'], ['view', 'approve'], ['warden-day-red']),
  screen('rebate-approvals', 'Legacy Rebates', 'Students', ['warden'], ['view', 'approve'], ['rebate']),
  screen('outpass-approvals', 'Outpass Approval', 'Students', ['warden'], ['view', 'approve'], ['outpass-approval']),
  screen('warden-rooms', 'Manage Rooms / Layout (Warden)', 'Rooms', ['warden'], crud, ['create-room', 'view-layout']),
  screen('room-allotment', 'Room Allotment', 'Rooms', ['warden'], ['view', 'create'], ['room-allotment']),
  screen('room-requests', 'Room Requests', 'Rooms', ['warden'], ['view', 'approve'], ['approve-room-requests']),
  screen('weekly-menu', 'Today’s Menu / Weekly Plan / Settings', 'Mess & dining', ['mess', 'warden'], ['view', 'create', 'edit', 'generate'], ['menus', 'weekly-menu', 'menu-settings'], 'These tabs share menu metadata. Publish controls weekly plans; Edit controls settings and overrides; Add controls consumption.'),
  screen('menu-templates', 'Menu Templates / Planner', 'Mess & dining', ['mess'], crud, ['menu-templates', 'menu-planner', 'create-menu']),
  screen('menu-schedule', 'Menu Schedule', 'Mess & dining', ['mess'], crud, ['menu-schedule']),
  screen('recipes', 'Recipes', 'Mess & dining', ['mess'], crud, ['recipe']),
  screen('uoms', 'Units of Measure', 'Inventory & stock', ['mess'], crud, ['uoms']),
  screen('manage-inventories', 'Manage Inventories', 'Inventory & stock', [], crud, ['manage-inventories']),
  screen('inventory', 'Inventory / Items / Stock / Purchases', 'Inventory & stock', ['mess'], [...crud, 'export'], ['inventory', 'items', 'stock', 'inventory-transactions', 'purchase-by-store'], 'Inventory tabs share stock and purchase records.'),
  screen('consumption', 'Meal Entry / Record Consumption', 'Inventory & stock', ['mess'], ['view', 'create', 'edit'], ['single-page-daily-entry', 'record-consumption', 'daily-operations', 'daily-consumption']),
  screen('stores', 'Manage Stores', 'Inventory & stock', ['mess'], crud, ['stores', 'item-store-mapping']),
  screen('purchase-orders', 'Purchase Orders', 'Inventory & stock', ['mess'], ['view', 'create', 'edit', 'export'], ['purchase-orders']),
  screen('special-food-items', 'Additional Food Items', 'Additional food', ['mess'], crud, ['special-food-items']),
  screen('staff-food-consumption', 'Record Additional Consumption', 'Additional food', ['mess'], ['view', 'create'], ['consumption']),
  screen('food-orders', 'Orders Dashboard', 'Additional food', ['mess'], ['view', 'create', 'edit', 'delete', 'export'], ['food-orders-dashboard', 'food-orders']),
  screen('inventory-reports', 'Hostel / Inventory / Consumption / Rate Reports', 'Reports & billing', ['mess'], ['view', 'export'], ['inventory-reports', 'consumption-report', 'daily-rate-report'], 'Report tabs share the report workspace.'),
  screen('daily-expenses', 'Daily Expenses', 'Reports & billing', ['mess'], [...crud, 'export'], ['Daily-expenses']),
  screen('mess-fees', 'Mess / Bed / Paper Billing', 'Reports & billing', ['mess', 'warden'], ['view', 'create', 'edit', 'delete', 'generate', 'export'], ['mess-fee', 'mess-bills', 'calculate-daily-charges', 'paper-bill-generator', 'bed-fee-management'], 'Mess, bed and paper billing use the same student-fee records and share these permissions.'),
  screen('income-entry', 'Income Entry / Additional Income', 'Reports & billing', ['mess', 'warden'], ['view', 'create'], ['income-deduction-entry', 'hostel-additional-income']),
  screen('credit-tokens', 'Credit Tokens / Concerns', 'Reports & billing', ['mess'], crud, ['sister-bill-concern']),
  screen('my-profile', 'My Profile', 'Student services', students, ['view', 'edit'], ['profile']),
  screen('my-leaves', 'My Leaves / Apply Leave', 'Student services', students, crud, ['my-leaves', 'apply-leave']),
  screen('my-complaints', 'My Complaints / Submit Complaint', 'Student services', students, crud, ['my-complaints', 'submit-complaint']),
  screen('my-reductions', 'My Mess Reductions', 'Student services', students, ['view', 'create', 'edit', 'delete'], ['day-reduction']),
  screen('my-rooms', 'View Room / Room Requests', 'Student services', students, ['view', 'create', 'delete'], ['view-rooms']),
  screen('my-fees', 'My Fees / Mess History', 'Student services', students, ['view', 'export'], ['hfee', 'hostel-fees', 'mess-charges', 'mess-history']),
  screen('my-food', 'Additional Food / My Orders', 'Student services', students, ['view', 'create', 'delete'], ['food-order', 'my-food-orders']),
  screen('my-transactions', 'My Transactions', 'Student services', students, ['view', 'export'], ['transactions']),
  screen('my-rebates', 'My Legacy Rebates', 'Student services', students, ['view', 'create'], ['my-rebates']),
  screen('my-facilities', 'Facility Usage', 'Student services', students, crud, ['facilities']),
  screen('my-outpass', 'My Outpass', 'Student services', students, ['view', 'create', 'delete'], ['outpass']),
  screen('parent-portal', 'Linked Student / Attendance / Profile', 'Parent services', ['parent'], ['view', 'edit'], [], 'Parent overview and attendance share the linked-student response.'),
  screen('gate-activity', 'Gate Activity / Students Outside', 'Security', ['security'], ['view']),
  screen('gate-scan', 'Scan / Verify Gate Pass', 'Security', ['security'], ['view', 'create']),
];
export const screenById = Object.fromEntries(SCREENS.map(s => [s.id, s]));
export function defaultPermissions() {
  return Object.fromEntries(Object.keys(ROLE_LABELS).map(role => [role, Object.fromEntries(SCREENS.map(s => [s.id, s.roles.includes(role) ? normalizeActions(s.actions) : []]))]));
}
export function can(grants, role, id, action = 'view') {
  role = normalizePermissionRole(role);
  return role === 'admin' || Boolean(grants?.[role]?.[id]?.includes('view') && grants[role][id].includes(action));
}
export function screenForView(view, workspace) {
  workspace = normalizePermissionRole(workspace);
  if (workspace === 'parent') return 'parent-portal';
  return SCREENS.find(s => s.views.includes(view) && s.roles.includes(workspace))?.id || null;
}
export function permissionLevel(actions, screenId) {
  if (!actions?.includes('view')) return 'hidden';
  if (actions.length === 1) return 'view';
  if (screenById[screenId].actions.every(a => actions.includes(a))) return 'manage';
  return 'custom';
}
export function normalizeActions(actions) {
  const unique = [...new Set(actions)];
  return Object.keys(ACTION_LABELS).filter(a => unique.includes(a) || a === 'view' && unique.length > 0);
}
export function validatePermissions(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid permissions.');
  const defaults = defaultPermissions();
  if (Object.keys(input).some(role => !Object.hasOwn(ROLE_LABELS, role))) throw new Error('Unknown role.');
  for (const role of Object.keys(defaults)) {
    if (!input[role] || Object.keys(input[role]).some(id => !Object.hasOwn(screenById, id))) throw new Error('Unknown or missing screen.');
    for (const s of SCREENS) {
      const actions = input[role][s.id];
      if (!Array.isArray(actions) || new Set(actions).size !== actions.length || actions.some(a => !s.actions.includes(a))) throw new Error(`Invalid actions for ${s.label}.`);
      if (!s.roles.includes(role) && actions.length) throw new Error(`${s.label} is not supported for ${ROLE_LABELS[role]}.`);
      if (actions.length && !actions.includes('view')) throw new Error(`View is required for ${s.label}.`);
      if (role === 'admin' && s.actions.some(a => !actions.includes(a))) throw new Error('Admin access is protected.');
      defaults[role][s.id] = normalizeActions(actions);
    }
  }
  return defaults;
}
export function permissionChanges(before, after) {
  const changes = [];
  for (const role of Object.keys(ROLE_LABELS)) for (const s of SCREENS) {
    const old = before?.[role]?.[s.id] || [], next = after?.[role]?.[s.id] || [];
    if (old.length !== next.length || old.some(a => !next.includes(a))) changes.push({ role, screen: s.id, before: old, after: next });
  }
  return changes;
}
