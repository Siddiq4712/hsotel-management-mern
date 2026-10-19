import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { adminAPI } from '../../services/api';
import BatchAllocationReview from './BatchAllocationReview';
const { Title, Text } = Typography;
export default function ManageSessions() {
  const [form] = Form.useForm();
  const [batches, setBatches] = useState([]), [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null), [open, setOpen] = useState(false), [review, setReview] = useState(false);
  const [search, setSearch] = useState(''), [hostelFilter, setHostelFilter] = useState(undefined);
  const start = Form.useWatch('start_year', form), end = Form.useWatch('end_year', form);
  const prefix = Form.useWatch('roll_prefix', form), assignedHostel = Form.useWatch('hostel_id', form);
  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([adminAPI.getSessions(), adminAPI.getHostels()]);
      setBatches(a.data.data || []); setHostels(b.data.data || []);
    } catch (error) { message.error(error.response?.data?.message || 'Unable to load batches'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const edit = batch => {
    setEditing(batch); form.resetFields();
    if (batch) form.setFieldsValue({ start_year: Number(batch.start_date.slice(0, 4)), end_year: Number(batch.end_date.slice(0, 4)), roll_prefix: batch.roll_prefix || '', hostel_id: batch.hostel_id });
    setOpen(true);
  };
  const save = async values => {
    setSaving(true);
    try {
      if (editing) await adminAPI.updateSession(editing.id, { ...values, is_active: true });
      else await adminAPI.createSession(values);
      message.success('Batch saved. Review allocation to update existing students.');
      setOpen(false); await load(); setReview(true);
    } catch (error) { message.error(error.response?.data?.message || 'Unable to save batch'); }
    finally { setSaving(false); }
  };
  const submit = values => {
    if (editing && (Number(values.hostel_id) !== Number(editing.hostel_id) || values.roll_prefix !== editing.roll_prefix)) {
      Modal.confirm({ title: 'Change batch allocation rules?', content: `${editing.student_count || 0} students currently belong to this batch. After saving, review the proposed student changes before applying them.`, onOk: () => save(values) });
    } else return save(values);
  };
  const archive = batch => Modal.confirm({ title: `Archive ${batch.name}?`, content: 'Batches with active students cannot be archived. Historical records are retained.', onOk: async () => {
    try { await adminAPI.deleteSession(batch.id); await load(); }
    catch (error) { message.error(error.response?.data?.message || 'Unable to archive batch'); }
  } });
  const query = search.trim().toLowerCase();
  const filtered = batches.filter(batch => (!hostelFilter || batch.hostel_id === hostelFilter) && [batch.name, batch.roll_prefix, batch.hostel_name].some(value => String(value || '').toLowerCase().includes(query)));
  return <div className="module-page p-8 bg-slate-50 min-h-screen">
    <div className="module-page-header flex flex-wrap justify-between gap-4 mb-6">
      <div><Title level={2}>Manage Batches</Title><Text type="secondary">Roll number prefix → Batch → Hostel</Text></div>
      <Space wrap><Button onClick={() => setReview(true)}>Review Batch Allocation</Button><Button onClick={load}>Refresh</Button><Button type="primary" onClick={() => edit(null)}>Add Batch</Button></Space>
    </div>
    <Alert type="info" showIcon title="One batch belongs to one hostel. A hostel can contain multiple batches." description="Configure each batch prefix, then review allocation to correct existing students. Historical bills keep their original hostel and amounts." className="mb-4" />
    <Card>
      <Space wrap className="mb-4"><Input aria-label="Search batches" allowClear placeholder="Search batch, prefix or hostel" value={search} onChange={event => setSearch(event.target.value)} style={{ width: 280 }} /><Select aria-label="Filter batches by hostel" allowClear placeholder="All hostels" value={hostelFilter} onChange={setHostelFilter} style={{ width: 220 }} options={hostels.map(hostel => ({ value: hostel.id, label: hostel.name }))} /></Space>
      <Table loading={loading} rowKey="id" dataSource={filtered} scroll={{ x: 900 }} columns={[
        { title: 'Batch', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: 'Roll Prefix', dataIndex: 'roll_prefix', render: value => value || <Tag color="orange">Needs setup</Tag> },
        { title: 'Assigned Hostel', dataIndex: 'hostel_name', render: value => value || 'Unassigned' },
        { title: 'Students', dataIndex: 'student_count' },
        { title: 'Status', dataIndex: 'is_active', render: value => <Tag color={value ? 'green' : 'default'}>{value ? 'Active' : 'Archived'}</Tag> },
        { title: 'Actions', key: 'actions', render: (_, batch) => <Space><Button onClick={() => edit(batch)}>Edit</Button><Button danger disabled={!batch.is_active} onClick={() => archive(batch)}>Archive</Button></Space> }
      ]} />
    </Card>
    <Modal title={editing ? 'Edit Batch' : 'Add Batch'} open={open} onCancel={() => !saving && setOpen(false)} onOk={() => form.submit()} confirmLoading={saving} okText="Save Batch">
      <Form form={form} layout="vertical" onFinish={submit} disabled={saving}>
        <Space align="start"><Form.Item name="start_year" label="Start Year" rules={[{ required: true }]}><InputNumber min={2000} max={2099} onChange={year => { if (!editing && year) form.setFieldsValue({ end_year: year + 4, roll_prefix: String(year).slice(-2) }); }} /></Form.Item><Form.Item name="end_year" label="End Year" dependencies={['start_year']} rules={[{ required: true }, { validator: (_, value) => value > form.getFieldValue('start_year') ? Promise.resolve() : Promise.reject(new Error('End year must be later')) }]}><InputNumber min={2001} max={2100} /></Form.Item></Space>
        <Form.Item label="Batch Name"><Input readOnly value={start && end ? `${start}-${end}` : ''} /></Form.Item>
        <Form.Item name="roll_prefix" label="Roll Number Prefix" rules={[{ required: true }, { pattern: /^\d{1,20}$/, message: 'Enter digits only' }, { validator: (_, value) => batches.some(batch => batch.id !== editing?.id && batch.roll_prefix && value && (value.startsWith(batch.roll_prefix) || batch.roll_prefix.startsWith(value))) ? Promise.reject(new Error('Prefix duplicates or overlaps another batch')) : Promise.resolve() }]}><Input placeholder="e.g. 24" maxLength={20} /></Form.Item>
        <Form.Item name="hostel_id" label="Assigned Hostel" rules={[{ required: true }]}><Select placeholder="Choose hostel" options={hostels.map(hostel => ({ value: hostel.id, label: hostel.name }))} /></Form.Item>
        <Text type="secondary">{prefix || '24'}104085 → {start && end ? `${start}-${end}` : '2024-2028'} → {hostels.find(hostel => hostel.id === assignedHostel)?.name || 'Choose hostel'}</Text>
      </Form>
    </Modal>
    <BatchAllocationReview open={review} onClose={() => setReview(false)} onApplied={load} />
  </div>;
}
