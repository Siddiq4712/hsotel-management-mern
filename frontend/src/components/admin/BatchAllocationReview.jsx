import React, { useEffect, useState } from 'react';
import { Alert, Input, Modal, Space, Table, Tag, message, Select, Button } from 'antd';
import { adminAPI } from '../../services/api';

export default function BatchAllocationReview({ open, onClose, onApplied }) {
  const [preview, setPreview] = useState({ rows: [], token: '' });
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]), [search, setSearch] = useState('');
  const [status, setStatus] = useState('changes'), [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setSelected([]); setError('');
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
  return <Modal title="Review Batch Allocation" open={open} width={1200} onCancel={() => !saving && onClose()} onOk={() => Modal.confirm({ title: `Update ${selected.length} selected students?`, content: 'Current batch and hostel allocation will change. Historical fees, bills and attendance are preserved.', onOk: apply })} okText={`Apply to ${selected.length} Students`} confirmLoading={saving} okButtonProps={{ disabled: loading || Boolean(error) || !selected.length }} cancelButtonProps={{ disabled: saving }} mask={{ closable: !saving }}>
    <Alert type="info" showIcon title="Review existing students before applying changes." description="Students with unmatched prefixes, multiple active enrollments, or rooms in a different hostel require attention first." className="mb-4" />
    {error && <Alert type="error" title={error} />}
    <Space wrap className="mb-4"><Input placeholder="Search name or roll number" aria-label="Search allocation students" allowClear value={search} onChange={event => { setSearch(event.target.value); setSelected([]); }} /><Select value={status} onChange={value => { setStatus(value); setSelected([]); }} options={[{ value: 'changes', label: 'Changes and conflicts' }, { value: 'ready', label: 'Ready to update' }, { value: 'conflict', label: 'Conflicts' }, { value: 'all', label: 'All students' }]} /><Button onClick={load} disabled={saving}>Refresh Preview</Button></Space>
    <Table rowKey="student_id" loading={loading} dataSource={data} scroll={{ x: 1100, y: 420 }} pagination={{ pageSize: 10 }} rowSelection={{ selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: row => ({ disabled: saving || row.status !== 'ready' }) }} columns={[
      { title: 'Student', dataIndex: 'name', width: 160 }, { title: 'Roll Number', dataIndex: 'roll_number', width: 120 },
      { title: 'Current Batch', dataIndex: 'current_batch', width: 140 }, { title: 'Proposed Batch', dataIndex: 'batch', width: 140 },
      { title: 'Current Hostel', dataIndex: 'current_hostel', width: 160 }, { title: 'Proposed Hostel', dataIndex: 'hostel', width: 160 },
      { title: 'Status', key: 'status', width: 240, render: (_, row) => <><Tag color={row.status === 'ready' ? 'green' : row.status === 'conflict' ? 'orange' : 'default'}>{row.status}</Tag>{row.reason}</> }
    ]} />
  </Modal>;
}
