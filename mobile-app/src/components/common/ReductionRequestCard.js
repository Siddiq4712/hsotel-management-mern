import React, { useState } from 'react';
import { View, Text } from 'react-native';
import RequestDetails, { personName, displayDate } from './RequestDetails';
import Button from './Button';
import colors from '../../theme/colors';

export function reductionReview(row) {
  const decisions = [...(row.Decisions || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id);
  const pending = row.status === 'pending_admin';
  const latest = pending ? null : decisions.find(item => ['approve', 'reject', 'return', 'cancel'].includes(item.action));
  const processor = row.status.endsWith('_admin') ? row.AdminProcessor : row.WardenProcessor;
  return {
    reviewedBy: pending ? null : personName(latest?.Actor) || personName(processor),
    label: row.status.startsWith('rejected') ? 'Rejected by' : row.status === 'needs_correction' ? 'Returned by' : row.status === 'cancelled' ? 'Cancelled by' : 'Approved by',
    remarks: pending ? null : latest ? latest.remarks : row.status.endsWith('_admin') ? row.admin_remarks : row.warden_remarks,
    latest,
    // Keep the audit trail available without repeating the latest decision in the card.
    earlier: decisions.filter(item => item !== latest),
  };
}

export default function ReductionRequestCard({ row, categoryLabel, submittedBy, children }) {
  const [expanded, setExpanded] = useState(false);
  const review = reductionReview(row);
  const statusLabel = {
    pending_admin: 'Pending review', approved_by_admin: 'Approved', approved_by_warden: 'Approved',
    rejected_by_admin: 'Rejected', rejected_by_warden: 'Rejected', needs_correction: 'Needs correction', cancelled: 'Cancelled',
  }[row.status];
  return <RequestDetails title={categoryLabel} reference={row.id} status={row.status} statusLabel={statusLabel}
    submittedBy={submittedBy || [personName(row.Student, row.student_id), row.Student?.roll_number].filter(Boolean).join(' · ')}
    reviewedBy={review.reviewedBy} reviewLabel={review.label} submittedAt={row.createdAt}
    reviewedAt={row.status === 'pending_admin' ? null : row.decided_at}
    fromDate={row.from_date} toDate={row.to_date} duration={row.requested_days ? `${row.requested_days} days, inclusive` : null}
    reason={row.reason} fields={[
      { label: 'Hostel', value: row.Hostel?.name }, { label: 'Activity / organization', value: row.activity, full: true },
      { label: 'Remarks', value: review.remarks, full: true },
    ]}>
    {children}
    {!!review.earlier.length && <>
      <Button variant="ghost" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}>{expanded ? 'Hide earlier activity' : `Earlier activity (${review.earlier.length})`}</Button>
      {expanded && review.earlier.map(item => <View key={item.id} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.background, gap: 4 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', textTransform: 'capitalize' }}>{item.action}</Text>
        <Text style={{ color: colors.mutedText, fontSize: 13 }}>{personName(item.Actor) || item.actor_role} · {displayDate(item.createdAt, true)}</Text>
        {!!item.remarks && <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{item.remarks}</Text>}
      </View>)}
    </>}
  </RequestDetails>;
}
