export function studentBatch(batchYear, batches) {
  const raw = String(batchYear ?? '').trim();
  if (!/^\d{4}$/.test(raw) || Number(raw) < 2000 || Number(raw) > 2100) return null;
  const matches = batches.filter(batch => batch.is_active && Number(batch.erp_batch_year) === Number(raw));
  return matches.length === 1 && matches[0].hostel_id ? matches[0] : null;
}
