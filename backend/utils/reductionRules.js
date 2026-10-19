export const REDUCTION_CATEGORIES = {
  medical: { label: 'Medical leave', document: "Doctor’s prescription", attendance: 'A' },
  od: { label: 'OD', document: 'OD letter (NSS / NCC camp / college participation)', attendance: 'OD' },
  internship: { label: 'Internship', document: 'Internship offer letter', attendance: 'OD' },
  study_holiday: { label: 'Study holiday', document: 'Reduction letter signed by tutor', attendance: 'A' }
};
export const APPROVED_REDUCTION_STATUSES = ['approved_by_admin', 'approved_by_warden'];
export const errorWithStatus = (message, status = 400) => Object.assign(new Error(message), { status });

export function dateOnly(value) {
  const date = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) {
    throw errorWithStatus('Enter a valid date in YYYY-MM-DD format.');
  }
  return date;
}

export function reductionDates(from, to) {
  const start = dateOnly(from), end = dateOnly(to);
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (days < 1 || days > 366) throw errorWithStatus('End date must be on or after start date; a request can cover at most 366 days.');
  return Array.from({ length: days }, (_, i) => new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10));
}

export function validateReduction(body) {
  if (!Object.hasOwn(REDUCTION_CATEGORIES, body.category)) throw errorWithStatus('Select medical leave, OD, internship, or study holiday.');
  const dates = reductionDates(body.from_date, body.to_date);
  const reason = String(body.reason || '').trim();
  if (reason.length < 5 || reason.length > 2000) throw errorWithStatus('Enter a reason between 5 and 2000 characters.');
  return { category: body.category, from_date: dates[0], to_date: dates.at(-1), reason,
    activity: String(body.activity || '').trim().slice(0, 150) || null };
}

export function canReviewReduction(user, request) {
  return user?.role === 'admin' || (user?.role === 'warden' && Number(user.hostel_id ?? user.hostelId) === Number(request.hostel_id));
}

// This function deliberately accepts no attendance records. Presence cannot grant a discount.
export function calculateBillableDays({ dates, holidays = [], approvedDates = [], eligibleFrom = null, eligibleTo = null }) {
  const closed = new Set(holidays), reduced = new Set(approvedDates);
  const baseDates = [...new Set(dates)].filter(date => !closed.has(date) && (!eligibleFrom || date >= eligibleFrom) && (!eligibleTo || date <= eligibleTo));
  const reductionDates = baseDates.filter(date => reduced.has(date));
  const billableDates = baseDates.filter(date => !reduced.has(date));
  return { baseDays: baseDates.length, approvedReductionDays: reductionDates.length, billableDays: billableDates.length,
    baseDates, reductionDates, billableDates };
}
