import React, { useEffect, useState } from 'react';
import { Alert, Input, Modal, Space, Table, Tag, message, Select, Button, Checkbox } from 'antd';
import { adminAPI } from '../../services/api';

export default function BatchAllocationReview({ open, onClose, onApplied }) {
  const [preview, setPreview] = useState({ rows: [], token: '' });
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]), [search, setSearch] = useState('');
  const [status, setStatus] = useState('changes'), [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const load = async () => {
    setLoading(true); setSelected([]); setCurrentPage(1); setError('');
    try { setPreview((await adminAPI.previewBatchAllocation()).data.data); }
    catch (failure) { setError(failure.response?.data?.message || 'Unable to preview allocation'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) { setSearch(''); setStatus('changes'); load(); } }, [open]);
  const apply = async () => {
    setSaving(true);
    try {
      const result = await adminAPI.applyBatchAllocation({ student_ids: selected, token: preview.token });
      message.success(result.data.message); await load(); await onApplied?.();
    } catch (failure) { message.error(failure.response?.data?.message || 'Unable to apply allocation'); }
    finally { setSaving(false); }
  };
  const query = search.trim().toLowerCase();
  const data = preview.rows.filter(row => (status === 'all' || (status === 'changes' ? row.status !== 'unchanged' : row.status === status)) && [row.name, row.roll_number, row.batch, row.hostel].some(value => String(value || '').toLowerCase().includes(query)));
  const eligibleIds = data.filter(row => row.status === 'ready').map(row => row.student_id);
  const selectedCount = eligibleIds.filter(id => selected.includes(id)).length;
  const selectionDisabled = loading || saving || Boolean(error) || !eligibleIds.length;
  return <Modal title="Review Batch Allocation" open={open} width={1200} onCancel={() => !saving && onClose()} onOk={() => Modal.confirm({ title: `Update ${selected.length} selected students?`, content: 'Current batch and hostel allocation will change. Historical fees, bills and attendance are preserved.', onOk: apply })} okText={`Apply to ${selected.length} Students`} confirmLoading={saving} okButtonProps={{ disabled: loading || Boolean(error) || !selected.length }} cancelButtonProps={{ disabled: saving }} mask={{ closable: !saving }}>
    <Alert type="info" showIcon title="Review existing students before applying changes." description="Students with unmatched prefixes, multiple active enrollments, or rooms in a different hostel require attention first." className="mb-4" />
    {error && <Alert type="error" title={error} />}
    <Space wrap className="mb-4"><Input placeholder="Search name or roll number" aria-label="Search allocation students" allowClear value={search} disabled={saving} onChange={event => { setSearch(event.target.value); setSelected([]); setCurrentPage(1); }} /><Select value={status} disabled={saving} onChange={value => { setStatus(value); setSelected([]); setCurrentPage(1); }} options={[{ value: 'changes', label: 'Changes and conflicts' }, { value: 'ready', label: 'Ready to update' }, { value: 'conflict', label: 'Conflicts' }, { value: 'all', label: 'All students' }]} /><Button onClick={load} disabled={saving}>Refresh Preview</Button></Space>
    <Space wrap className="mb-4">
      <Button disabled={selectionDisabled} onClick={() => setSelected(eligibleIds)}>Select all matching eligible students ({eligibleIds.length})</Button>
      <Button disabled={saving || !selected.length} onClick={() => setSelected([])}>Clear selection</Button>
      <span>{selectedCount} of {eligibleIds.length} eligible students selected across all pages ({data.length} matching students).</span>
    </Space>
    <Table rowKey="student_id" loading={loading} dataSource={data} scroll={{ x: 1100, y: 420 }} pagination={{
      current: currentPage, pageSize, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100],
      onChange: (page, size) => { setCurrentPage(size === pageSize ? page : 1); setPageSize(size); },
      showTotal: total => `${total} matching students`
    }} rowSelection={{
      selectedRowKeys: selected, onChange: setSelected, preserveSelectedRowKeys: true,
      columnTitle: <Checkbox aria-label="Select all matching eligible students" disabled={selectionDisabled} checked={eligibleIds.length > 0 && selectedCount === eligibleIds.length} indeterminate={selectedCount > 0 && selectedCount < eligibleIds.length} onChange={event => setSelected(event.target.checked ? eligibleIds : [])} />,
      getCheckboxProps: row => ({ disabled: loading || saving || Boolean(error) || row.status !== 'ready' })
    }} columns={[
      { title: 'Student', dataIndex: 'name', width: 160 }, { title: 'Roll Number', dataIndex: 'roll_number', width: 120 },
      { title: 'Current Batch', dataIndex: 'current_batch', width: 140 }, { title: 'Proposed Batch', dataIndex: 'batch', width: 140 },
      { title: 'Current Hostel', dataIndex: 'current_hostel', width: 160 }, { title: 'Proposed Hostel', dataIndex: 'hostel', width: 160 },
      { title: 'Status', key: 'status', width: 240, render: (_, row) => <><Tag color={row.status === 'ready' ? 'green' : row.status === 'conflict' ? 'orange' : 'default'}>{row.status}</Tag>{row.reason}</> }
    ]} />
  </Modal>;
}
