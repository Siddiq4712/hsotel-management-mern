import { PermissionButton as Button, PermissionModal } from './PermissionControls';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, App, Card, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { adminAPI, reductionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { approvedReduction, categoryInfo, reductionCategories, reductionStatus } from '../../utils/reductionOptions';
import ReductionEvidence from './ReductionEvidence';

export default function ReductionReview({ role: screenRole }) {
  const { user } = useAuth();
  const role = user?.role === 'admin' ? 'admin' : screenRole;
  const { message } = App.useApp();
  const [rows, setRows] = useState([]), [hostels, setHostels] = useState([]);
  const [filters, setFilters] = useState({ status: 'pending_admin', category: 'all', hostel_id: 'all' });
  const [search, setSearch] = useState(''), [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null), [decision, setDecision] = useState(null);
  const [remarks, setRemarks] = useState(''), [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await reductionAPI.list(role, filters)).data.data); }
    catch (error) { message.error(error.message); }
    finally { setLoading(false); }
  }, [role, filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (role === 'admin') adminAPI.getHostels().then(r => setHostels(r.data.data || [])).catch(error => message.error(error.message)); }, [role]);
  const choose = (row, action) => { setDecision({ row, action }); setRemarks(''); };
  const save = async () => {
    if (decision.action !== 'approve' && remarks.trim().length < 5) return message.error('Enter a reason of at least 5 characters.');
    setSaving(true);
    try {
      const response = await reductionAPI.decide(role, decision.row.id, { action: decision.action, remarks });
      message.success(response.data.message); setDecision(null); setSelected(null); await load();
    } catch (error) { message.error(error.message); }
    finally { setSaving(false); }
  };
  const visible = rows.filter(row => `${row.Student?.userName} ${row.Student?.roll_number} ${row.id}`.toLowerCase().includes(search.toLowerCase()));
  const columns = [
    { title: 'Student', key: 'student', render: (_, row) => <><strong>{row.Student?.userName || `Student #${row.student_id}`}</strong><div>{row.Student?.roll_number}</div></> },
    ...(role === 'admin' ? [{ title: 'Hostel', key: 'hostel', render: (_, row) => row.Hostel?.name }] : []),
    { title: 'Category', key: 'category', render: (_, row) => <>{categoryInfo(row.category)?.label || 'Legacy request'}<div><Tag>{row.attendance_status === 'A' ? 'Absent' : row.attendance_status || 'Unclassified'} on approval</Tag></div></> },
    { title: 'Start → end date', key: 'period', render: (_, row) => <>{row.from_date} → {row.to_date}<div>{row.requested_days} days, inclusive</div></> },
    { title: 'Status', key: 'status', render: (_, row) => <Tag color={approvedReduction(row) ? 'green' : row.status === 'pending_admin' ? 'gold' : 'default'}>{reductionStatus(row)}</Tag> },
    { title: 'Review', key: 'review', render: (_, row) => <Button onClick={() => setSelected(row)}>Review request #{row.id}</Button> }
  ];
  return <div className="module-page p-4 lg:p-8 bg-slate-50 min-h-screen space-y-5">
    <Typography.Title level={2}>Mess Reductions</Typography.Title>
    <Alert type="info" showIcon message={role === 'admin' ? 'Approve reductions across all hostels' : 'Approve reductions for your hostel'}
      description="Either the warden or admin can approve. Approved dates become OD for internship/OD, or Absent for medical/study holiday. Only approved operational days reduce food charges; water and other charges are unchanged." />
    <Card><Space wrap>
      <Input aria-label="Search reduction requests" placeholder="Search name, roll number, or request" value={search} onChange={e => setSearch(e.target.value)} />
      <Select aria-label="Request status" value={filters.status} style={{ width: 200 }} onChange={status => setFilters(f => ({ ...f, status }))}
        options={[{ value: 'pending_admin', label: 'Pending review' }, { value: 'all', label: 'All requests' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'needs_correction', label: 'Returned for correction' }, { value: 'cancelled', label: 'Cancelled' }]} />
      <Select aria-label="Reduction category" value={filters.category} style={{ width: 230 }} onChange={category => setFilters(f => ({ ...f, category }))}
        options={[{ value: 'all', label: 'All categories' }, ...reductionCategories]} />
      {role === 'admin' && <Select aria-label="Hostel filter" value={filters.hostel_id} style={{ width: 200 }} onChange={hostel_id => setFilters(f => ({ ...f, hostel_id }))}
        options={[{ value: 'all', label: 'All hostels' }, ...hostels.map(h => ({ value: h.id, label: h.name }))]} />}
      <Button onClick={load}>Refresh</Button>
    </Space></Card>
    <Card><Table dataSource={visible} rowKey="id" columns={columns} loading={loading} scroll={{ x: 900 }} /></Card>
    <Modal open={Boolean(selected)} title={selected ? `Reduction request #${selected.id}` : ''} onCancel={() => setSelected(null)} footer={null} width={760}>
      {selected && <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text strong>{selected.Student?.userName} · {selected.Hostel?.name}</Typography.Text>
        <div>{categoryInfo(selected.category)?.label || 'Legacy request'} · {selected.from_date} → {selected.to_date} · {selected.requested_days} days</div>
        <div>{selected.activity}</div><p style={{ whiteSpace: 'pre-wrap' }}>{selected.reason}</p>
        <div>Required document: {categoryInfo(selected.category)?.document || 'Category and document must be resubmitted'}</div>
        <ReductionEvidence role={role} request={selected} />
        {selected.legacy && <Alert type="warning" message="Legacy record: category and supporting evidence must be resubmitted before this request can grant reduction." />}
        <div>Decision history</div>
        {(selected.Decisions || []).slice().sort((a, b) => a.id - b.id).map(d => <div key={d.id}><strong>{d.action}</strong> · {d.Actor?.userName || d.actor_role} · {new Date(d.createdAt).toLocaleString()}<div>{d.remarks}</div></div>)}
        <Space wrap>
          {['pending_admin', 'needs_correction'].includes(selected.status) && <>
            <Button permissionAction="approve" type="primary" disabled={selected.legacy || !selected.document} onClick={() => choose(selected, 'approve')}>Approve date range</Button>
            <Button permissionAction="approve" danger onClick={() => choose(selected, 'reject')}>Reject</Button>
            <Button permissionAction="approve" onClick={() => choose(selected, 'return')}>Return for correction</Button>
          </>}
          {approvedReduction(selected) && !selected.legacy && <Button permissionAction="approve" danger onClick={() => choose(selected, 'cancel')}>Cancel approval</Button>}
        </Space>
      </Space>}
    </Modal>
    <PermissionModal permissionAction="approve" open={Boolean(decision)} title={decision ? `${decision.action === 'return' ? 'Return' : decision.action.charAt(0).toUpperCase() + decision.action.slice(1)} reduction` : ''}
      onCancel={() => !saving && setDecision(null)} onOk={save} confirmLoading={saving} okText="Confirm decision" closable={!saving} maskClosable={!saving}>
      {decision?.action === 'approve' && <p>Approve {decision.row.from_date} through {decision.row.to_date}, inclusive. Attendance will become {categoryInfo(decision.row.category)?.attendance}. Only eligible operational days reduce food charges.</p>}
      {decision?.action === 'cancel' && <p>This restores attendance saved before approval and removes the reduction. Recorded billing periods are protected.</p>}
      <label>Remarks {decision?.action !== 'approve' ? '(required)' : '(optional)'}<Input.TextArea aria-label="Decision remarks" rows={4} maxLength={2000} value={remarks} onChange={e => setRemarks(e.target.value)} /></label>
    </PermissionModal>
  </div>;
}
