export const COLLEGES = [{ value: 'nec', label: 'NEC' }, { value: 'lapc', label: 'LAPC' }];

// Records created before college-aware batches belonged to the NEC configuration.
export function normalizeCollege(value) {
  const college = String(value ?? 'nec').trim().toLowerCase();
  if (!COLLEGES.some(option => option.value === college)) throw new Error('Choose a valid college (NEC or LAPC).');
  return college;
}

export function assertAdmissionSource(college, source) {
  const normalized = normalizeCollege(college);
  if (normalized === 'lapc' && source !== 'excel') throw new Error('LAPC students must be imported through Excel. Select LAPC in Bulk Import & Preview.');
  return normalized;
}
