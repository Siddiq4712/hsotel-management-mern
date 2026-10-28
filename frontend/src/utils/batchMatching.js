import { normalizeCollege } from '../../../shared/colleges.js';

export function studentBatch(batchYear, batches, gender, college = 'nec') {
  const raw = String(batchYear ?? '').trim();
  if (!/^\d{4}$/.test(raw) || Number(raw) < 2000 || Number(raw) > 2100) return null;
  const g = String(gender ?? '').trim().toLowerCase();
  const normalizedGender = ['male', 'm'].includes(g) ? 'male' : ['female', 'f'].includes(g) ? 'female' : null;
  if (!normalizedGender) return null;
  let normalizedCollege;
  try { normalizedCollege = normalizeCollege(college); } catch { return null; }
  const matches = batches.filter(batch => batch.is_active && Number(batch.erp_batch_year) === Number(raw) && batch.gender === normalizedGender && (batch.college ?? 'nec') === normalizedCollege);
  return matches.length === 1 && matches[0].hostel_id ? matches[0] : null;
}
