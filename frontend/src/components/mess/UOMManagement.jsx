import React, { useCallback, useEffect, useRef, useState } from 'react';
import { App, Button, Card, Form, Input, Select, Table, Tag } from 'antd';
import { Pencil, Plus, RefreshCw, Ruler, Search } from 'lucide-react';
import { messAPI } from '../../services/api';
import WorkspaceAlert from '../common/WorkspaceAlert';
import WorkspacePageHeader from '../common/WorkspacePageHeader';
import WorkspaceToolbar from '../common/WorkspaceToolbar';
import { PermissionButton, PermissionModal } from '../common/PermissionControls';

const types = [
  { value: 'weight', label: 'Weight' },
  { value: 'volume', label: 'Volume' },
  { value: 'length', label: 'Length' },
  { value: 'count', label: 'Count' },
  { value: 'other', label: 'Other' },
];

export default function UOMManagement() {
  const { message } = App.useApp();
  const [units, setUnits] = useState([]);
  const [type, setType] = useState();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadRevision = useRef(0);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    const revision = ++loadRevision.current;
    setLoading(true);
    setError('');
    try {
      const response = await messAPI.getUOMs(type ? { type } : {});
      if (revision === loadRevision.current) setUnits(response.data.data || []);
    } catch (failure) {
      if (revision === loadRevision.current) setError(failure.message || 'Unable to load units.');
    } finally {
      if (revision === loadRevision.current) setLoading(false);
    }
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const open = (unit = {}) => {
    form.resetFields();
    form.setFieldsValue(unit);
    setEditing(unit);
  };

  const save = async (values) => {
    setSaving(true);
    try {
      if (editing.id) await messAPI.updateUOM(editing.id, values);
      else await messAPI.createUOM(values);
      message.success(editing.id ? 'Unit updated.' : 'Unit added.');
      setEditing(null);
      await load();
    } catch (failure) {
      message.error(failure.message || 'Unable to save the unit.');
    } finally {
      setSaving(false);
    }
  };

  const query = search.trim().toLowerCase();
  const visibleUnits = units.filter(unit =>
    [unit.name, unit.abbreviation].some(value => String(value ?? '').toLowerCase().includes(query)));
  const columns = [
    { title: 'Unit name', dataIndex: 'name' },
    { title: 'Abbreviation', dataIndex: 'abbreviation', render: value => <Tag>{value}</Tag> },
    { title: 'Measurement type', dataIndex: 'type', render: value => types.find(option => option.value === value)?.label || value },
    { title: 'Actions', key: 'actions', align: 'center', width: 110, render: (_, unit) => (
      <PermissionButton permissionAction="edit" icon={<Pencil size={14} />} aria-label={`Edit ${unit.name}`} disabled={loading || Boolean(error)} onClick={() => open(unit)}>Edit</PermissionButton>
    ) },
  ];

  return <section className="module-page" aria-labelledby="units-title">
    <WorkspacePageHeader id="units-title" title="Units of Measure" icon={Ruler} description="Manage the units used for inventory and ingredients." />
    <Card>
      <WorkspaceToolbar className="mb-4">
        <Input aria-label="Search units" className="workspace-search" prefix={<Search size={16} aria-hidden="true" />}
          placeholder="Search by name or abbreviation" allowClear value={search} onChange={event => setSearch(event.target.value)} />
        <Select aria-label="Measurement type filter" className="workspace-toolbar-filter" placeholder="All types"
          options={types} allowClear value={type} onChange={setType} />
        <div className="workspace-toolbar-actions">
          <Button icon={<RefreshCw size={16} />} loading={loading} onClick={load}>Refresh</Button>
          <PermissionButton permissionAction="create" type="primary" icon={<Plus size={16} />} onClick={() => open()}>Add New Unit</PermissionButton>
        </div>
      </WorkspaceToolbar>
      {error && <WorkspaceAlert type="error" showIcon title={error} className="mb-4" />}
      <Table rowKey="id" columns={columns} dataSource={visibleUnits} loading={loading} scroll={{ x: 560 }}
        locale={{ emptyText: error ? 'Units could not be loaded' : (query || type ? 'No units match your filters' : 'No units yet') }}
        pagination={{ pageSize: 10, showTotal: total => `${total} ${total === 1 ? 'unit' : 'units'}` }} />
    </Card>
    <PermissionModal permissionAction={editing?.id ? 'edit' : 'create'} title={editing?.id ? 'Edit Unit' : 'Add Unit'} open={Boolean(editing)}
      onCancel={() => setEditing(null)} onOk={() => form.submit()} okText={editing?.id ? 'Save changes' : 'Add unit'} confirmLoading={saving}
      forceRender closable={!saving} keyboard={!saving} mask={{ closable: !saving }} cancelButtonProps={{ disabled: saving }}>
      <Form form={form} name="measure-unit" layout="vertical" onFinish={save} disabled={saving}>
        <Form.Item name="name" label="Unit name" rules={[{ required: true, whitespace: true }]}>
          <Input placeholder="e.g. Kilogram" />
        </Form.Item>
        <Form.Item name="abbreviation" label="Abbreviation" rules={[{ required: true, whitespace: true }]}>
          <Input placeholder="e.g. kg" />
        </Form.Item>
        <Form.Item name="type" label="Measurement type" rules={[{ required: true }]}>
          <Select placeholder="Choose a type" options={types} />
        </Form.Item>
      </Form>
    </PermissionModal>
  </section>;
}
