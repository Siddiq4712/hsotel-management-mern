export const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snacks'];
export const DEFAULT_CONFIGURATION = {
  default_count: 0,
  slots: [
    { key: 'breakfast', label: 'Breakfast', time: '07:30', category: 'breakfast' },
    { key: 'lunch', label: 'Lunch', time: '12:30', category: 'lunch' },
    { key: 'snacks', label: 'Evening tea', time: '16:30', category: 'snacks' },
    { key: 'dinner', label: 'Dinner', time: '19:30', category: 'dinner' }
  ],
  permissions: { plan: ['mess'], override: ['mess'], consume: ['mess'], settings: ['mess'] }
};
export function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
export function integer(value, label, min = 0, max = 100000) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim()) || !Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) fail(`${label} must be a whole number between ${min} and ${max}`);
  return Number(value);
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('Choose a valid date (YYYY-MM-DD)');
  return value;
}
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function text(value, label, max = 500) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`${label} is required (maximum ${max} characters)`);
  return value.trim();
}
export function validateConfiguration(input) {
  const default_count = integer(input.default_count, 'Default student count');
  if (!Array.isArray(input.slots) || !input.slots.length || input.slots.length > 12) fail('Configure between 1 and 12 meal slots');
  const keys = new Set();
  const slots = input.slots.map(slot => {
    if (!slot || typeof slot !== 'object') fail('Each meal slot must have a name, time and report category');
    if (!/^[a-z][a-z0-9_-]{0,39}$/.test(slot.key) || keys.has(slot.key)) fail('Meal slot IDs must be unique lowercase identifiers');
    keys.add(slot.key);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time) || !CATEGORIES.includes(slot.category)) fail('Each slot needs a valid time and stock-report category');
    return { key: slot.key, label: text(slot.label, 'Meal label', 80), time: slot.time, category: slot.category };
  });
  const permissions = {};
  for (const action of ['plan', 'override', 'consume', 'settings']) {
    const roles = input.permissions?.[action];
    if (!Array.isArray(roles) || roles.some(role => !['mess', 'warden'].includes(role))) fail('Permissions support mess staff and wardens; administrators always retain access');
    permissions[action] = [...new Set(roles)];
  }
  return { default_count, slots, permissions };
}
export function canEdit(configuration, role, action) {
  return role === 'admin' || !!configuration.permissions[action]?.includes(role);
}
export function resolvePlan(plans, date) {
  validDate(date);
  // A newer regular version replaces the older one permanently, even after its end date.
  const regular = plans.filter(p => p.kind === 'regular' && p.effective_from <= date)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from) || b.id - a.id)[0];
  const temporary = plans.filter(p => p.kind === 'temporary' && p.effective_from <= date && p.effective_to >= date)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from) || b.id - a.id)[0];
  return temporary || (regular && (!regular.effective_to || regular.effective_to >= date) ? regular : null);
}
export function resolveDay(plans, records, configuration, date) {
  const plan = resolvePlan(plans, date);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const slots = [...(plan?.slots || configuration.slots)];
  for (const row of records) if (!slots.some(slot => slot.key === row.slot_key)) slots.push(row.snapshot.slot);
  return slots.map(slot => {
    const record = records.find(row => row.slot_key === slot.key);
    const meal = plan?.meals.find(entry => entry.day === weekday && entry.slot_key === slot.key);
    const baseline = { slot, dishes: meal?.dishes || '', ingredients: meal?.ingredients || [],
      expected_count: plan?.default_count ?? configuration.default_count, plan_id: plan?.id || null,
      plan_name: plan?.name || null, menu_id: meal?.menu_id || null };
    return { ...baseline, ...(record?.snapshot || {}), slot_key: slot.key,
      status: record?.status || 'planned', overridden: !!record,
      source_key: record ? `daily:${record.id}:${record.revision}` : `plan:${plan?.id || 0}:${weekday}:${slot.key}`,
      total_cost: record?.total_cost ?? null, actual_consumption: record?.actual_consumption || [],
      configured: !!(record || meal), date };
  });
}
export function validateActualConsumption(input) {
  if (!Array.isArray(input) || !input.length || input.length > 200) fail('Enter at least one ingredient actually consumed');
  const seen = new Set();
  return input.map(row => {
    if (!row || typeof row !== 'object') fail('Each consumption row must contain an ingredient and quantity');
    const item_id = integer(row.item_id, 'Ingredient', 1, 2147483647);
    const quantity = Number(row.quantity);
    if (seen.has(item_id)) fail('Each ingredient must appear only once');
    seen.add(item_id);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 99999999 || Math.abs(quantity * 100 - Math.round(quantity * 100)) > 0.00001) fail('Actual quantities must be positive with at most two decimal places');
    return { item_id, quantity };
  }).sort((a, b) => a.item_id - b.item_id);
}
