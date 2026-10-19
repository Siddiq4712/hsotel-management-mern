import crypto from 'node:crypto';

export const sensitiveField = key => /password|token|secret|otp|google_id/i.test(key);
function redact(value) {
  if(Array.isArray(value))return value.map(redact);
  if(!value || typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).filter(([key])=>!sensitiveField(key)).map(([key,value])=>[key,redact(value)]));
}
export function snapshot(model, row) {
  if (!row) return null;
  const source = row.get ? row.get({ plain: true }) : row;
  const value = {};
  for (const [key, attribute] of Object.entries(model.rawAttributes)) {
    if (attribute.type?.key === 'VIRTUAL' || sensitiveField(key)) continue;
    if (source[key] !== undefined) value[key] = attribute.type?.key === 'BOOLEAN' && source[key] !== null ? Boolean(source[key]) : source[key];
  }
  return redact(JSON.parse(JSON.stringify(value)));
}
export function primaryKey(model, row) {
  return Object.fromEntries(model.primaryKeyAttributes.map(key => [key, row[key]]));
}
export const recordKey = key => JSON.stringify(key);
export const sameValues = (left, right) => stable(left) === stable(right);
function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}
export const previewHash = value => crypto.createHash('sha256').update(stable(value)).digest('hex');
export function changedFields(before, after) {
  return [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])]
    .filter(key => !sameValues(before?.[key], after?.[key]));
}
export function consolidateChanges(changes) {
  const rows = new Map();
  for (const change of changes) {
    const key = `${change.model_name}:${change.record_key}`;
    const old = rows.get(key);
    rows.set(key, { ...change, before_values: old ? old.before_values : change.before_values });
  }
  return [...rows.values()].filter(row => !sameValues(row.before_values, row.after_values));
}
