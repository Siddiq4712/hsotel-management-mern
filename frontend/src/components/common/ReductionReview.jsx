import RequestQueue, { filterRequests, requestPagination, RequestSearch } from './RequestQueue';
import RequestActions, { requestActionsColumnWidth } from './RequestActions';
import RequestReviewDialog from './RequestReviewDialog';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { Check, RefreshCw } from 'lucide-react';
import { useScopeDraft } from './WorkspaceScope';
import { PermissionButton as Button, PermissionModal } from './PermissionControls';
import React, { useCallback, useEffect, useState } from 'react';
import { App, Input, Select, Table, Tag } from 'antd';
import Alert from './WorkspaceAlert';
import { adminAPI, reductionAPI } from '../../services/api';
import { useStaffWorkspace } from '../../context/StaffWorkspaceContext';
import { approvedReduction, categoryInfo, reductionCategories, reductionStatus } from '../../utils/reductionOptions';
import ReductionEvidence from './ReductionEvidence';

const pendingReduction = row => ['pending_admin', 'needs_correction'].includes(row.status);

export default function ReductionReview({ role: screenRole }) {
  const staff = useStaffWorkspace();
  const { user } = useAuth();
  const role = staff ? staff.role : screenRole;
  const { can } = usePermissions();
  const canDecide = can(role === 'admin' ? 'admin-reductions' : 'warden-reductions', 'approve');
  const { message } = App.useApp();
  const [rows, setRows] = useState([]), [hostels, setHostels] = useState([]);
  const [filters, setFilters] = useState({ status: 'pending_admin', category: 'all', hostel_id: 'all' });
  const [search, setSearch] = useState(''), [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null), [decision, setDecision] = useState(null);
  const [remarks, setRemarks] = useState(''), [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');
  useScopeDraft(Boolean(decision && remarks.trim()), saving);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try { setRows((await reductionAPI.list(role, filters)).data.data); }
    catch (error) { setRows([]); setLoadError(error.message || 'Could not load reduction requests.'); }
    finally { setLoading(false); }
  }, [role, filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (role === 'admin') adminAPI.getHostels().then(r => setHostels(r.data.data || [])).catch(error => message.error(error.message)); }, [role]);
  const choose = (row, action) => { setDecision({ row, action }); setRemarks(''); setSaveError(''); };
  const save = async () => {
    if (!decision || saving || !canDecide) return;
    setSaveError('');
    if (decision.action !== 'approve' && remarks.trim().length < 5) return message.error('Enter a reason of at least 5 characters.');
    setSaving(true);
    try {
      const response = await reductionAPI.decide(role, decision.row.id, { action: decision.action, remarks });
      message.success(response.data.message); setDecision(null); setSelected(null); await load();
    } catch (error) { setSaveError(error.message || 'Could not save this decision.'); }
    finally { setSaving(false); }
  };
  const visible = filterRequests(rows, search, row => [row.id]);
  const columns = [
    { title: 'Student', key: 'student', render: (_, row) => <><strong>{row.Student?.userName || `Student #${row.student_id}`}</strong><div>{row.Student?.roll_number}</div></> },
    ...(role === 'admin' ? [{ title: 'Hostel', key: 'hostel', render: (_, row) => row.Hostel?.name }] : []),
    { title: 'Category', key: 'category', render: (_, row) => <>{categoryInfo(row.category)?.label || 'Legacy request'}<div><Tag>{row.attendance_status === 'A' ? 'Absent' : row.attendance_status || 'Unclassified'} on approval</Tag></div></> },
    { title: 'Start → end date', key: 'period', render: (_, row) => <>{row.from_date} → {row.to_date}<div>{row.requested_days} days, inclusive</div></> },
    { title: 'Status', key: 'status', render: (_, row) => <Tag color={approvedReduction(row) ? 'green' : row.status === 'pending_admin' ? 'gold' : 'default'}
      className={row.status === 'pending_admin' ? 'request-pending-tag' : undefined}>{reductionStatus(row)}</Tag> },
    { title: 'Actions', key: 'actions', align: 'right', width: requestActionsColumnWidth, render: (_, row) => {
      const pending = canDecide && pendingReduction(row);
      return <RequestActions
        reviewLabel={`Review request #${row.id}`} onReview={() => setSelected(row)} disabled={loading}
        onAccept={pending ? () => choose(row, 'approve') : undefined} acceptDisabled={row.legacy || !row.document}
        onReject={pending ? () => choose(row, 'reject') : undefined} />;
    } }
  ];
  return <div className="module-page">
    <RequestQueue title="Mess Reductions" description="Review attendance dates and supporting documents for mess reductions."
      scope={role === 'admin' ? hostels.find(hostel => String(hostel.id) === String(filters.hostel_id))?.name || 'All hostels' : staff?.hostel?.name || user?.hostel?.name}
      pending={!loading && !loadError ? visible.filter(pendingReduction).length : 0}
      count={!loading && !loadError ? visible.length : undefined} listTitle="Reduction requests"
      filters={<>
      <RequestSearch label="Search reduction requests" placeholder="Name, roll number, or request ID" value={search} onChange={setSearch} />
      <Select aria-label="Request status" value={filters.status} onChange={status => setFilters(f => ({ ...f, status }))}
        options={[{ value: 'pending_admin', label: 'Pending review' }, { value: 'all', label: 'All requests' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'needs_correction', label: 'Returned for correction' }, { value: 'cancelled', label: 'Cancelled' }]} />
      <Select aria-label="Reduction category" value={filters.category} onChange={category => setFilters(f => ({ ...f, category }))}
        options={[{ value: 'all', label: 'All categories' }, ...reductionCategories]} />
      {role === 'admin' && <Select aria-label="Hostel filter" value={filters.hostel_id} onChange={hostel_id => setFilters(f => ({ ...f, hostel_id }))}
        options={[{ value: 'all', label: 'All hostels' }, ...hostels.map(h => ({ value: h.id, label: h.name }))]} />}
      <Button icon={<RefreshCw size={16} />} onClick={load} loading={loading}>Refresh</Button>
      </>}>
      {loadError ? <div className="request-queue-message"><Alert type="error" showIcon title={loadError} action={<Button onClick={load}>Retry</Button>} /></div>
        : <Table locale={{ emptyText: 'No reduction requests match these filters.' }} dataSource={visible} rowKey="id" columns={columns}
            pagination={requestPagination} loading={loading} scroll={{ x: 1020 }} />}
    </RequestQueue>
    <RequestReviewDialog open={Boolean(selected)} title={selected ? `Review reduction request #${selected.id}` : 'Review reduction request'}
      onClose={() => setSelected(null)} resident={selected?.Student?.userName} hostel={selected?.Hostel?.name}
      status={selected && <Tag color={approvedReduction(selected) ? 'success' : selected.status === 'pending_admin' ? 'warning' : 'default'}
        className={selected.status === 'pending_admin' ? 'request-pending-tag' : undefined}>{reductionStatus(selected)}</Tag>}
      details={selected ? [['From', selected.from_date], ['To', selected.to_date], ['Days', selected.requested_days],
        ['Category', categoryInfo(selected.category)?.label || 'Legacy request']] : []}
      actions={selected && canDecide && <>
        {pendingReduction(selected) && <>
          <Button permissionAction="approve" onClick={() => choose(selected, 'return')}>Return for correction</Button>
          <Button permissionAction="approve" danger onClick={() => choose(selected, 'reject')}>Reject</Button>
          <Button permissionAction="approve" type="primary" icon={<Check size={16} aria-hidden="true" />}
            disabled={selected.legacy || !selected.document} onClick={() => choose(selected, 'approve')}>Approve date range</Button>
        </>}
        {approvedReduction(selected) && !selected.legacy && <Button permissionAction="approve" danger onClick={() => choose(selected, 'cancel')}>Cancel approval</Button>}
      </>}>
      {selected && <>
        {(selected.activity || selected.reason) && <div><strong className="request-review-label">Reason</strong>
          {selected.activity && <div>{selected.activity}</div>}
          {selected.reason && <p className="request-review-note">{selected.reason}</p>}
        </div>}
        <div>Required document: {categoryInfo(selected.category)?.document || 'Category and document must be resubmitted'}</div>
        <ReductionEvidence role={role} request={selected} />
        {selected.legacy && <Alert type="warning" message="Legacy record: category and supporting evidence must be resubmitted before this request can grant reduction." />}
        <Alert type="info" showIcon title="How approval affects billing"
          description="Approved internship or OD dates are marked OD. Approved medical or study holiday dates are marked Absent. Approved operational days reduce food charges only." />
        {selected.Decisions?.length > 0 && <div><strong className="request-review-label">Decision history</strong>
          {selected.Decisions.slice().sort((a, b) => a.id - b.id).map(d => <div key={d.id}><strong>{d.action}</strong> · {d.Actor?.userName || d.actor_role} · {new Date(d.createdAt).toLocaleString()}<div>{d.remarks}</div></div>)}
        </div>}
      </>}
    </RequestReviewDialog>
    <PermissionModal permissionAction="approve" open={Boolean(decision)} title={decision ? `${decision.action === 'return' ? 'Return' : decision.action.charAt(0).toUpperCase() + decision.action.slice(1)} reduction` : ''}
      onCancel={() => !saving && setDecision(null)} onOk={save} confirmLoading={saving} okText="Confirm decision" width={880} closable={!saving} mask={{ closable: !saving }}>
      {decision && <p><strong>{decision.row.Student?.userName || `Student #${decision.row.student_id}`}</strong> · Request #{decision.row.id}</p>}
      {decision?.action === 'approve' && <p>Approve {decision.row.from_date} through {decision.row.to_date}, inclusive. Attendance will become {categoryInfo(decision.row.category)?.attendance}. Only eligible operational days reduce food charges.</p>}
      {decision?.action === 'cancel' && <p>This restores attendance saved before approval and removes the reduction. Recorded billing periods are protected.</p>}
      {saveError && <Alert type="error" showIcon title={saveError} />}
      <label>Remarks {decision?.action !== 'approve' ? '(required)' : '(optional)'}<Input.TextArea aria-label="Decision remarks" rows={4} maxLength={2000} disabled={saving} value={remarks} onChange={e => setRemarks(e.target.value)} /></label>
    </PermissionModal>
  </div>;
}
