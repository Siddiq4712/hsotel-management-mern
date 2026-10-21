import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestTimeline, requestReview, requestStatus, requestTime, returnTiming } from '../src/utils/requestDetails.js';

const createdAt = '2026-10-18T03:02:00.000Z';
test('pending leave has a recorded submission and an untimed future decision', () => {
  const events = requestTimeline('leave', { status: 'pending', createdAt });
  assert.equal(events.length, 2);
  assert.equal(events[0].at, createdAt);
  assert.equal(events[1].pending, true);
  assert.equal(events[1].at, undefined);
});
test('reduction activity sorts actual audit rows without duplicating submission', () => {
  const row = { status: 'needs_correction', createdAt, Decisions: [
    { id: 2, action: 'return', createdAt: '2026-10-20T10:45:00Z', actor_role: 'warden', Actor: { userName: 'Reviewer' }, remarks: 'Upload a signed letter.' },
    { id: 1, action: 'submitted', createdAt },
  ] };
  assert.deepEqual(requestTimeline('reduction', row).map(e => e.title), ['Request submitted', 'Returned for correction']);
  assert.equal(requestReview('reduction', row).name, 'Reviewer');
  assert.equal(requestReview('reduction', row).remarks, 'Upload a signed letter.');
  assert.equal(requestReview('reduction', row).role, 'warden');
});
test('resubmitted reductions retain prior activity but await a fresh review', () => {
  const row = { status: 'pending_admin', createdAt, Decisions: [
    { id: 1, action: 'return', createdAt: '2026-10-19T05:00:00Z', Actor: { userName: 'Prior reviewer' }, remarks: 'Old remarks' },
    { id: 2, action: 'resubmitted', createdAt: '2026-10-20T05:00:00Z' },
  ] };
  const review = requestReview('reduction', row);
  assert.equal(review.name, 'Awaiting review');
  assert.equal(review.at, null);
  assert.equal(review.remarks, null);
  assert.deepEqual(requestTimeline('reduction', row).map(e => e.title), ['Request submitted', 'Returned for correction', 'Request resubmitted', 'Warden decision']);
});
test('gate movement history uses recorded exit and return timestamps', () => {
  const row = { status: 'completed', createdAt, approved_date: '2026-10-19T05:00:00Z', Approver: { userName: 'Reviewer' }, exit_time: '2026-10-20T03:38:00Z', return_time: '2026-10-20T08:16:00Z', to_date: '2026-10-20T08:30:00Z' };
  assert.deepEqual(requestTimeline('gatepass', row).map(e => e.key), ['submitted', 'decision', 'exit', 'return']);
  assert.equal(requestReview('gatepass', row).name, 'Reviewer');
  assert.equal(returnTiming(row), '14 minutes early');
  assert.equal(requestTime(row.exit_time), '20 Oct 2026 · 9:08 AM');
});
test('unrecorded gate movements are never inferred from the planned dates', () => {
  const row = { status: 'approved', createdAt, from_date: '2026-10-20T03:30:00Z', to_date: '2026-10-20T08:30:00Z' };
  assert.equal(requestTimeline('gatepass', row).some(e => ['exit', 'return'].includes(e.key)), false);
  assert.equal(returnTiming(row), null);
  assert.equal(requestReview('gatepass', row).name, 'Not recorded');
});
test('late and on-time returns are derived from the actual return time', () => {
  const row = { to_date: '2026-10-20T08:30:00Z', return_time: '2026-10-20T08:44:00Z' };
  assert.equal(returnTiming(row), '14 minutes late');
  assert.equal(returnTiming({ ...row, return_time: row.to_date }), 'Returned on time');
});
test('status banners distinguish returned, rejected and completed requests', () => {
  assert.equal(requestStatus({ status: 'needs_correction' }).tone, 'warning');
  assert.equal(requestStatus({ status: 'rejected_by_warden' }).label, 'Rejected');
  assert.equal(requestStatus({ status: 'completed' }).title, 'Returned to hostel');
});
