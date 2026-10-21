import moment from 'moment';

export const requestPerson = person => person?.userName || person?.username || null;
export const requestTime = value => value && moment(value).isValid()
  ? moment(value).utcOffset(330).format('DD MMM YYYY · h:mm A') : 'Time not recorded';
export const requestDate = value => value && moment(value).isValid() ? moment(value).format('DD MMM YYYY') : 'Not recorded';

export function requestReview(kind, row) {
  const pending = ['pending', 'pending_admin'].includes(row.status);
  const latest = [...(row.Decisions || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || Number(b.id) - Number(a.id))
    .find(item => ['approve', 'reject', 'return', 'cancel'].includes(item.action));
  const processor = kind === 'reduction' ? row.status?.endsWith('_admin') ? row.AdminProcessor : row.WardenProcessor : row.ApprovedBy || row.Approver;
  return {
    name: pending ? 'Awaiting review' : requestPerson(latest?.Actor) || requestPerson(processor) || 'Not recorded',
    role: latest?.actor_role || (row.status?.endsWith('_admin') ? 'admin' : row.status?.endsWith('_warden') ? 'warden' : null),
    at: pending ? null : kind === 'reduction' ? latest?.createdAt || row.decided_at : row.approved_date,
    remarks: pending ? null : kind === 'reduction' ? latest?.remarks || row.warden_remarks || row.admin_remarks : row.remarks || row.comment,
  };
}

export function requestStatus(row) {
  const status = row.status || 'unknown';
  if (status === 'needs_correction') return { tone: 'warning', label: 'Changes requested', title: 'Changes requested' };
  if (status.includes('reject')) return { tone: 'danger', label: 'Rejected', title: 'Request rejected' };
  if (status === 'cancelled') return { tone: 'mutedText', label: 'Cancelled', title: 'Request cancelled' };
  if (status === 'completed') return { tone: 'success', label: 'Completed', title: 'Returned to hostel' };
  if (status === 'late_return') return { tone: 'warning', label: 'Late return', title: row.return_time ? 'Returned after the expected time' : 'Expected return time has passed' };
  if (status === 'outside') return { tone: 'primary', label: 'Outside', title: 'Student is outside the hostel' };
  if (status === 'expired') return { tone: 'danger', label: 'Expired', title: 'Gate pass expired' };
  if (status.startsWith('approved')) return { tone: 'success', label: 'Approved', title: 'Request approved' };
  if (['pending', 'pending_admin'].includes(status)) return { tone: 'warning', label: 'Pending review', title: 'Awaiting warden review' };
  return { tone: 'mutedText', label: status.replace(/_/g, ' '), title: 'Request status' };
}

export function requestTimeline(kind, row) {
  const events = [{ key: 'submitted', title: kind === 'leave' ? 'Application submitted' : 'Request submitted', at: row.createdAt, tone: 'success' }];
  const labels = { submit: 'Request submitted', submitted: 'Request submitted', revise: 'Request resubmitted', resubmit: 'Request resubmitted', resubmitted: 'Request resubmitted', approve: 'Approved', reject: 'Rejected', return: 'Returned for correction', cancel: 'Cancelled' };
  if (kind === 'reduction') {
    const decisions = [...(row.Decisions || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || Number(a.id) - Number(b.id));
    decisions.filter(item => !['submit', 'submitted'].includes(item.action)).forEach(item => events.push({
      key: `decision-${item.id}`, title: labels[item.action] || item.action, at: item.createdAt, actor: requestPerson(item.Actor),
      tone: item.action === 'reject' ? 'danger' : item.action === 'return' ? 'warning' : 'success',
    }));
    if (!decisions.length && row.decided_at && !['pending', 'pending_admin'].includes(row.status)) {
      const status = requestStatus(row), review = requestReview(kind, row);
      events.push({ key: 'decision', title: status.label, at: row.decided_at, actor: review.name === 'Not recorded' ? null : review.name, tone: status.tone });
    }
  } else if (row.approved_date) {
    const rejected = row.status === 'rejected';
    events.push({ key: 'decision', title: rejected ? 'Rejected' : 'Approved', at: row.approved_date, actor: requestPerson(row.ApprovedBy || row.Approver), tone: rejected ? 'danger' : 'success' });
  }
  if (kind === 'gatepass') {
    if (row.exit_time) events.push({ key: 'exit', title: 'Exit recorded', at: row.exit_time, tone: 'success' });
    if (row.return_time) events.push({ key: 'return', title: 'Return recorded', at: row.return_time, tone: 'success' });
  }
  if (['pending', 'pending_admin'].includes(row.status)) events.push({ key: 'pending', title: 'Warden decision', detail: 'Awaiting review', tone: 'mutedText', pending: true });
  return events;
}

export function returnTiming(row) {
  if (!row.return_time || !row.to_date) return null;
  const minutes = Math.round(moment(row.to_date).diff(moment(row.return_time), 'minutes', true));
  return minutes === 0 ? 'Returned on time' : `${Math.abs(minutes)} minutes ${minutes > 0 ? 'early' : 'late'}`;
}
