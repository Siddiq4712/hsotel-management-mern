import moment from 'moment';

export function trendDates(today = new Date()) {
  const end = moment(today).startOf('day');
  return Array.from({ length: 7 }, (_, index) => end.clone().subtract(6 - index, 'days').format('YYYY-MM-DD'));
}

export function buildAttendanceTrend(rows, dates) {
  const days = new Map(dates.map(date => [date, { date, present: 0, absent: 0, od: 0, total: 0, percent: null }]));
  const seen = new Set();
  for (const row of rows) {
    const date = String(row.date || '').slice(0, 10);
    const day = days.get(date), id = row.student_id ?? row.user_id;
    if (!day || id == null || row.is_monthly || !['P', 'A', 'OD'].includes(row.status)) continue;
    const key = `${date}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    day.total++;
    day[{ P: 'present', A: 'absent', OD: 'od' }[row.status]]++;
  }
  return [...days.values()].map(day => ({ ...day, percent: day.total ? Math.round((day.present + day.od) / day.total * 100) : null }));
}

export function pendingApprovalRows(leaves, passes, reductions) {
  return [
    ...leaves.filter(row => row.status === 'pending').map(row => ({ kind: 'leave', row })),
    ...passes.filter(row => row.status === 'pending').map(row => ({ kind: 'passes', row })),
    ...reductions.filter(row => row.status === 'pending_admin').map(row => ({ kind: 'reductions', row })),
  ].sort((a, b) => (new Date(a.row.createdAt).getTime() || 0) - (new Date(b.row.createdAt).getTime() || 0) || Number(a.row.id) - Number(b.row.id));
}
