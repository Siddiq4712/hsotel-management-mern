import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Space, Modal, Input, message, Form, InputNumber, Table, Select } from 'antd';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { adminAPI } from '../../services/api';
import WorkspaceAlert from '../common/WorkspaceAlert';
import WorkspaceToolbar from '../common/WorkspaceToolbar';

export default function ManageRoomTypes({ active = true }) {
  const [form] = Form.useForm();
  const [roomTypes, setRoomTypes] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadRevision = useRef(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState();

  const fetchData = useCallback(async () => {
    const revision = ++loadRevision.current;
    setLoading(true);
    setError('');
    try {
      const [typeResponse, hostelResponse] = await Promise.all([adminAPI.getRoomTypes(), adminAPI.getHostels()]);
      if (revision !== loadRevision.current) return;
      setRoomTypes(typeResponse.data.data || []);
      setHostels(hostelResponse.data.data || []);
    } catch (error) {
      if (revision === loadRevision.current) setError(error.message || 'Unable to load room types.');
    } finally {
      if (revision === loadRevision.current) setLoading(false);
    }
  }, []);

  useEffect(() => { if (active) fetchData(); }, [active, fetchData]);

  const openRoomType = (type) => {
    setEditingId(type?.id ?? null);
    form.resetFields();
    form.setFieldsValue(type
      ? { name: type.name, capacity: type.capacity, hostel_id: type.hostel_id, description: type.description }
      : { hostel_id: hostelFilter });
    setIsModalOpen(true);
  };

  const saveRoomType = async (values) => {
    setSaving(true);
    try {
      if (editingId) await adminAPI.updateRoomType(editingId, values);
      else await adminAPI.createRoomType(values);
      message.success(editingId ? 'Room type updated.' : 'Room type added.');
      setIsModalOpen(false);
      await fetchData();
    } catch (error) {
      message.error(error.message || 'Unable to save room type.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRoomType = (type) => {
    Modal.confirm({
      title: `Delete room type ${type.name}?`,
      content: 'Room types assigned to active rooms cannot be deleted.',
      okText: 'Delete room type',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await adminAPI.deleteRoomType(type.id);
          setRoomTypes(current => current.filter(item => item.id !== type.id));
          message.success('Room type deleted.');
          await fetchData();
        } catch (error) {
          message.error(error.message || 'Unable to delete room type.');
          throw error;
        }
      }
    });
  };

  const namesByHostel = new Map(hostels.map(hostel => [Number(hostel.id), hostel.name]));
  const hostelOptions = hostels.map(hostel => ({ value: hostel.id, label: hostel.name }));
  const query = search.trim().toLowerCase();
  const visibleTypes = roomTypes.filter(type =>
    (!hostelFilter || Number(type.hostel_id) === Number(hostelFilter)) &&
    [type.name, type.description].some(text => String(text ?? '').toLowerCase().includes(query)));
  const actionsDisabled = loading || Boolean(error);

  return <Card>
    <WorkspaceToolbar className="mb-4">
      <Input className="workspace-search" aria-label="Search room types" placeholder="Search by room type or description" allowClear
        prefix={<Search size={16} aria-hidden="true" />} value={search} onChange={event => setSearch(event.target.value)} />
      <Select className="workspace-toolbar-filter" aria-label="Filter room types by hostel" placeholder="All hostels" allowClear
        value={hostelFilter} onChange={setHostelFilter} options={hostelOptions} />
      <div className="workspace-toolbar-actions">
        <Button icon={<RefreshCw size={16} />} loading={loading} onClick={fetchData}>Refresh</Button>
        <Button type="primary" icon={<Plus size={16} />} disabled={actionsDisabled} onClick={() => openRoomType()}>Add Room Type</Button>
      </div>
    </WorkspaceToolbar>
    {error && <WorkspaceAlert type="error" showIcon title={error} className="mb-4" />}
    <Table rowKey="id" loading={loading} dataSource={visibleTypes} scroll={{ x: 680 }}
      locale={{ emptyText: error ? 'Room types could not be loaded' : (query || hostelFilter ? 'No room types match your filters' : 'No room types yet') }}
      columns={[
        { title: 'Room type', dataIndex: 'name' },
        { title: 'Hostel', key: 'hostel', render: (_, type) => namesByHostel.get(Number(type.hostel_id)) || '—' },
        { title: 'Capacity', dataIndex: 'capacity' },
        { title: 'Description', dataIndex: 'description', render: value => value || '—' },
        { title: 'Actions', key: 'actions', align: 'center', width: 164, render: (_, type) => <Space>
          <Button aria-label={`Edit room type ${type.name}`} disabled={actionsDisabled} onClick={() => openRoomType(type)}>Edit</Button>
          <Button danger aria-label={`Delete room type ${type.name}`} disabled={actionsDisabled} onClick={() => deleteRoomType(type)}>Delete</Button>
        </Space> },
      ]} />
    <Modal title={editingId ? 'Edit Room Type' : 'Add Room Type'} open={isModalOpen} onCancel={() => setIsModalOpen(false)}
      onOk={() => form.submit()} okText={editingId ? 'Save changes' : 'Add room type'} confirmLoading={saving} forceRender
      cancelButtonProps={{ disabled: saving }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }}>
      <Form form={form} name="admin-room-type" layout="vertical" onFinish={saveRoomType} disabled={saving}>
        <Form.Item name="hostel_id" label="Hostel" rules={[{ required: true }]}>
          <Select placeholder="Choose a hostel" options={hostelOptions} />
        </Form.Item>
        <Form.Item name="name" label="Room type name" rules={[{ required: true, whitespace: true }]}>
          <Input placeholder="e.g. Double room" />
        </Form.Item>
        <Form.Item name="capacity" label="Capacity" rules={[{ required: true }]}>
          <InputNumber min={1} precision={0} className="w-full" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  </Card>;
}
