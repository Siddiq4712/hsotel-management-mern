import sequelize from '../config/database.js';
import { PermissionPolicy, PermissionHistory } from '../models/permissions.js';
import { defaultPermissions, normalizeActions, validatePermissions, permissionChanges } from '../../shared/permissions.js';

export async function ensurePermissionPolicy() {
  await PermissionPolicy.findOrCreate({ where: { id: 1 }, defaults: { grants: defaultPermissions(), revision: 0 } });
}
export async function readPermissionPolicy(options = {}) {
  const policy = await PermissionPolicy.findByPk(1, options);
  if (!policy) throw new Error('Permission settings are not initialized. Restart the API to initialize them.');
  // New capabilities default to hidden for existing policies until explicitly enabled.
  // The Student bucket is authoritative for legacy LAPC accounts; old LAPC overrides are ignored.
  const grants = defaultPermissions();
  for (const role of Object.keys(grants)) if (role !== 'admin') {
    for (const id of Object.keys(grants[role])) {
      const supported = grants[role][id];
      const stored = policy.grants?.[role]?.[id];
      // Retired actions must not survive a catalogue update or make later saves invalid.
      grants[role][id] = Array.isArray(stored) && stored.includes('view')
        ? normalizeActions(stored.map(action => id === 'my-reductions' && action === 'approve' ? 'delete' : action).filter(action => supported.includes(action))) : [];
    }
  }
  return { revision: policy.revision, grants };
}
export async function savePermissionPolicy({ revision, grants, reason }, actor) {
  if (!Number.isSafeInteger(revision) || revision < 0) throw Object.assign(new Error('A valid revision is required.'), { status: 400 });
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) throw Object.assign(new Error('Enter a reason of 1–500 characters.'), { status: 400 });
  let validated;
  try { validated = validatePermissions(grants); } catch (error) { error.status = 400; throw error; }
  return sequelize.transaction(async transaction => {
    const row = await PermissionPolicy.findByPk(1, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw Object.assign(new Error('Permission settings are not initialized.'), { status: 503 });
    if (row.revision !== revision) throw Object.assign(new Error('Another administrator changed permissions. Reload and review your changes again.'), { status: 409 });
    const before = await readPermissionPolicy({ transaction });
    const changes = permissionChanges(before.grants, validated);
    if (!changes.length) return before;
    await PermissionHistory.create({ revision: revision + 1, actor_id: actor.userId, actor_name: actor.userName,
      reason: reason.trim(), changes }, { transaction });
    await row.update({ revision: revision + 1, grants: validated }, { transaction });
    return { revision: revision + 1, grants: validated };
  });
}
