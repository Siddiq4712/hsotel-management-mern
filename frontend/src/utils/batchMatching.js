export function studentBatch(rollNumber, batches) {
  const roll = String(rollNumber ?? '').trim();
  const matches = batches.filter(batch => batch.is_active && batch.roll_prefix && roll.startsWith(batch.roll_prefix));
  return matches.length === 1 && matches[0].hostel_id ? matches[0] : null;
}
