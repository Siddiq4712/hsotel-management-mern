import RequestQueue, { filterRequests, requestPagination, RequestSearch } from '../common/RequestQueue';
import RequestActions, { requestActionsColumnWidth } from '../common/RequestActions';
import RequestReviewDialog from '../common/RequestReviewDialog';
import { Check, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Empty, Input, Select, Skeleton, Table, Tag } from 'antd';
import { useSearchParams } from 'react-router-dom';
import moment from 'moment';
import { wardenAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useStaffWorkspace } from '../../context/StaffWorkspaceContext';
import { usePermissions } from '../../context/PermissionContext';
import { useScopeDraft } from '../common/WorkspaceScope';
import { screenForView } from '../../../../shared/permissions.js';

const statuses = {
  pending: { label: 'Pending review', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
};
const options = [{ value: 'all', label: 'All requests' },
  ...Object.entries(statuses).map(([value, { label }]) => ({ value, label }))];
const residentName = row => row.Student?.userName || `Resident #${row.student_id}`;
const dateRange = row => `${moment(row.from_date).format('DD MMM YYYY')} – ${moment(row.to_date).format('DD MMM YYYY')}`;
const statusTag = status => <Tag color={statuses[status]?.color} className={status === 'pending' ? 'request-pending-tag' : undefined}>{statuses[status]?.label || status}</Tag>;

export default function LeaveRequests() {
  const { user } = useAuth();
  const staff = useStaffWorkspace();
  const { can } = usePermissions();
  const canDecide = can(screenForView('leave-requests', 'warden'), 'approve');
  const [params, setParams] = useSearchParams();
  const selectedStatus = params.get('status');
  const status = Object.hasOwn(statuses, selectedStatus) ? selectedStatus : 'all';
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(null);
  const [intent, setIntent] = useState();
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [result, setResult] = useState('');
  const hostelName = staff?.hostel.name || user?.hostel?.name || user?.Hostel?.name;
  useScopeDraft(Boolean(selected && remarks.trim()), saving);

  function setStatus(value) {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('status');
    else next.set('status', value);
    setLoading(true);
    setParams(next);
  }

  const refresh = () => setRevision(value => value + 1);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    wardenAPI.getLeaveRequests(status === 'all' ? {} : { status })
      .then(response => { if (active) setRows(response.data.data || []); })
      .catch(failure => {
        if (active) setError(failure.message || 'Could not load leave requests.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, revision, staff?.id]);

  function review(row, decision) {
    setRemarks('');
    setSaveError('');
    setSelected(row);
    setIntent(decision);
  }

  async function decide(decision) {
    if (!selected || saving || !canDecide || selected.status !== 'pending') return;
    setSaving(true);
    setSaveError('');
    try {
      await wardenAPI.approveLeave(selected.id, { status: decision, remarks: remarks.trim() });
      setResult(`Leave request for ${residentName(selected)} ${decision}.`);
      setSelected(null);
      refresh();
    } catch (failure) {
      setSaveError(failure.message || 'Could not save the decision.');
    } finally {
      setSaving(false);
    }
  }

  const visible = filterRequests(rows, search);
  const columns = [
    { title: 'Resident', key: 'resident', render: (_, row) => <><strong>{residentName(row)}</strong>{row.Student?.roll_number && <div>{row.Student.roll_number}</div>}</> },
    { title: 'Dates', key: 'dates', render: (_, row) => <>{dateRange(row)}<div className="text-xs text-slate-500">Departure → Return</div></> },
    { title: 'Type', dataIndex: 'leave_type' },
    { title: 'Status', dataIndex: 'status', render: statusTag },
    { title: 'Actions', key: 'action', align: 'right', width: requestActionsColumnWidth, render: (_, row) => {
      const pending = canDecide && row.status === 'pending';
      return <RequestActions
        reviewLabel={`Review leave request for ${residentName(row)}`} onReview={() => review(row)}
        onAccept={pending ? () => review(row, 'approved') : undefined}
        onReject={pending ? () => review(row, 'rejected') : undefined} />;
    } },
  ];

  return (
    <div className="module-page">
      <RequestQueue title="Leave Requests" description="Review and manage resident leave requests." scope={hostelName}
        pending={!loading && !error ? visible.filter(row => row.status === 'pending').length : 0}
        count={!loading && !error ? visible.length : undefined} listTitle={status === 'all' ? 'All requests' : statuses[status].label}
        filters={<>
          <RequestSearch label="Search leave requests" value={search} onChange={setSearch} />
          <Select aria-label="Status" value={status} options={options} onChange={setStatus} />
          <Button icon={<RefreshCw size={16} />} onClick={refresh} loading={loading}>Refresh</Button>
        </>}>
      {result && <div className="request-queue-message" role="status"><Alert type="success" showIcon title={result} closable onClose={() => setResult('')} /></div>}
      {loading ? <div className="request-queue-message" aria-label="Loading leave requests"><Skeleton active /></div>
        : error ? <div className="request-queue-message"><Alert type="error" showIcon title="Could not load leave requests" description={error} action={<Button onClick={refresh}>Retry</Button>} /></div>
          : visible.length ? <Table rowKey="id" columns={columns} dataSource={visible} pagination={requestPagination} scroll={{ x: 760 }} />
            : search.trim() ? <Empty description="No leave requests match your search and status." />
            : <Empty description={status === 'all' ? 'No leave requests yet.' : `No ${status} leave requests.`}>
              {status !== 'all' && <Button onClick={() => setStatus('all')}>Show all requests</Button>}
            </Empty>}
      </RequestQueue>
      <RequestReviewDialog title={intent === 'approved' ? 'Accept leave request' : intent === 'rejected' ? 'Reject leave request' : 'Review leave request'}
        open={Boolean(selected)} busy={saving} onClose={() => setSelected(null)}
        status={selected && statusTag(selected.status)} resident={selected && residentName(selected)} hostel={hostelName}
        details={selected ? [
          ['Departure', moment(selected.from_date).format('DD MMM YYYY')],
          ['Return', moment(selected.to_date).format('DD MMM YYYY')], ['Type', selected.leave_type],
        ] : []}
        actions={canDecide && selected?.status === 'pending' && <>
          {(!intent || intent === 'rejected') && <Button danger loading={intent === 'rejected' && saving}
            disabled={saving} onClick={() => decide('rejected')}>{intent ? 'Confirm rejection' : 'Reject'}</Button>}
          {(!intent || intent === 'approved') && <Button type="primary" icon={<Check size={16} aria-hidden="true" />}
            loading={saving} onClick={() => decide('approved')}>{intent ? 'Confirm acceptance' : 'Approve'}</Button>}
        </>}>
        {selected && <>
          <div><strong className="request-review-label">Reason</strong><p className="request-review-note">{selected.reason || 'No reason provided.'}</p></div>
          {selected.status === 'pending' && canDecide ? (
            <div><label htmlFor="leave-remarks">Warden remarks</label>
              <Input.TextArea id="leave-remarks" placeholder="Enter your remarks..." value={remarks} disabled={saving} onChange={event => setRemarks(event.target.value)} rows={3} />
            </div>
          ) : selected.status !== 'pending' && (
            <div><strong className="request-review-label">Decision details</strong>
              {selected.ApprovedBy?.userName && <div>{selected.ApprovedBy.userName}</div>}
              <p className="request-review-note">{selected.remarks || 'No remarks recorded.'}</p>
            </div>
          )}
          {saveError && <Alert type="error" showIcon title="Could not save the decision" description={saveError} />}
        </>}
      </RequestReviewDialog>
    </div>
  );
}
