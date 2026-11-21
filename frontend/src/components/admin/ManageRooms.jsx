import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Col, Button, Space, Tag, Modal, Input, message, Form, InputNumber, Select, Row, Table } from 'antd';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { filterRooms, roomHasOccupants } from '../../utils/roomDirectory';
import BulkRoomCreator from '../common/BulkRoomCreator';
import WorkspaceAlert from '../common/WorkspaceAlert';
import WorkspaceToolbar from '../common/WorkspaceToolbar';

export default function ManageRooms({ active = true }) {
  const [form] = Form.useForm();
  const formHostel = Form.useWatch('hostel_id', form);
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadRevision = useRef(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState();
  const [occupancy, setOccupancy] = useState();

  const fetchData = useCallback(async () => {
    const revision = ++loadRevision.current;
    setLoading(true);
    setError('');
    try {
      const [roomResponse, hostelResponse, typeResponse] = await Promise.all([
        adminAPI.getRooms(), adminAPI.getHostels(), adminAPI.getRoomTypes()
      ]);
      if (revision !== loadRevision.current) return;
      setRooms(roomResponse.data.data || []);
      setHostels(hostelResponse.data.data || []);
      setRoomTypes(typeResponse.data.data || []);
    } catch (error) {
      if (revision === loadRevision.current) setError(error.message || 'Unable to load rooms.');
    } finally {
      if (revision === loadRevision.current) setLoading(false);
    }
  }, []);

  useEffect(() => { if (active) fetchData(); }, [active, fetchData]);

  const openRoom = (room) => {
    setEditingId(room?.id ?? null);
    form.resetFields();
    form.setFieldsValue(room
      ? { hostel_id: room.hostel_id, room_type_id: room.room_type_id, room_number: room.room_number, floor: room.floor }
      : { hostel_id: hostelFilter });
    setIsModalOpen(true);
  };

  const saveRoom = async (values) => {
    setSaving(true);
    try {
      if (editingId) await adminAPI.updateRoom(editingId, values);
      else await adminAPI.createRoom(values);
      message.success(editingId ? 'Room updated.' : 'Room added.');
      setIsModalOpen(false);
      await fetchData();
    } catch (error) {
      message.error(error.message || 'Unable to save room.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRoom = (room) => {
    Modal.confirm({
      title: `Delete room ${room.room_number}?`,
      content: room.Hostel?.name,
      okText: 'Delete room',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await adminAPI.deleteBulkRooms({ room_ids: [room.id], hostel_id: Number(room.hostel_id) });
          setRooms(current => current.filter(item => item.id !== room.id));
          message.success('Room deleted.');
          await fetchData();
        } catch (error) {
          message.error(error.message || 'Unable to delete room.');
          throw error;
        }
      }
    });
  };

  const visibleRooms = filterRooms(rooms, { search, hostel: hostelFilter, occupancy });
  const hostelOptions = hostels.map(hostel => ({ value: hostel.id, label: hostel.name }));
  const typeOptions = roomTypes.filter(type => Number(type.hostel_id) === Number(formHostel))
    .map(type => ({ value: type.id, label: type.name }));

  return <Card>
    <WorkspaceToolbar className="mb-4">
      <Input className="workspace-search" aria-label="Search room number" placeholder="Search room number" allowClear
        prefix={<Search size={16} aria-hidden="true" />} value={search} onChange={event => setSearch(event.target.value)} />
      <Select className="workspace-toolbar-filter" aria-label="Filter rooms by hostel" placeholder="All hostels" allowClear
        value={hostelFilter} onChange={setHostelFilter} options={hostelOptions} />
      <Select className="workspace-toolbar-filter" aria-label="Filter by occupancy" placeholder="All occupancy" allowClear
        value={occupancy} onChange={setOccupancy} options={[{ value: 'empty', label: 'Empty' }, { value: 'occupied', label: 'Occupied' }]} />
      <div className="workspace-toolbar-actions">
        <Button icon={<RefreshCw size={16} />} loading={loading} onClick={fetchData}>Refresh</Button>
        <BulkRoomCreator isAdmin triggerType="default" onCreated={fetchData} />
        <Button type="primary" icon={<Plus size={16} />} disabled={loading || Boolean(error)} onClick={() => openRoom()}>Add Room</Button>
      </div>
    </WorkspaceToolbar>
    {error && <WorkspaceAlert type="error" showIcon title={error} className="mb-4" />}
    <Table rowKey="id" loading={loading} dataSource={visibleRooms} scroll={{ x: 820 }}
      locale={{ emptyText: error ? 'Rooms could not be loaded' : (search.trim() || hostelFilter || occupancy ? 'No rooms match your filters' : 'No rooms yet') }}
      columns={[
        { title: 'Room number', dataIndex: 'room_number' },
        { title: 'Hostel', key: 'hostel', render: (_, room) => room.Hostel?.name || '—' },
        { title: 'Floor', dataIndex: 'floor', render: value => value ?? '—' },
        { title: 'Room type', key: 'type', render: (_, room) => room.RoomType?.name || '—' },
        { title: 'Occupancy', key: 'occupancy', render: (_, room) => {
          const occupied = roomHasOccupants(room);
          return <Tag color={occupied ? 'blue' : 'green'}>{occupied ? 'Occupied' : 'Empty'}</Tag>;
        } },
        { title: 'Actions', key: 'actions', align: 'center', width: 164, render: (_, room) => <Space>
          <Button aria-label={`Edit room ${room.room_number}`} disabled={loading || Boolean(error)} onClick={() => openRoom(room)}>Edit</Button>
          <Button danger aria-label={`Delete room ${room.room_number}`} disabled={loading || Boolean(error) || roomHasOccupants(room)}
            title={roomHasOccupants(room) ? 'Occupied rooms cannot be deleted' : undefined} onClick={() => deleteRoom(room)}>Delete</Button>
        </Space> },
      ]} />
    <Modal title={editingId ? 'Edit Room' : 'Add Room'} open={isModalOpen} onCancel={() => setIsModalOpen(false)}
      onOk={() => form.submit()} okText={editingId ? 'Save changes' : 'Add room'} confirmLoading={saving} forceRender
      cancelButtonProps={{ disabled: saving }} closable={!saving} keyboard={!saving} mask={{ closable: !saving }}>
      <Form form={form} name="admin-room" layout="vertical" onFinish={saveRoom} disabled={saving}
        onValuesChange={changed => { if (Object.hasOwn(changed, 'hostel_id')) form.setFieldValue('room_type_id', undefined); }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="hostel_id" label="Hostel" rules={[{ required: true }]}>
              <Select placeholder="Choose a hostel" options={hostelOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="room_type_id" label="Room type" rules={[{ required: true }]}>
              <Select placeholder={formHostel ? 'Choose a room type' : 'Choose a hostel first'} disabled={!formHostel}
                options={typeOptions} notFoundContent="No room types for this hostel" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="room_number" label="Room number" rules={[{ required: true, whitespace: true }]}>
              <Input placeholder="e.g. A-101" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="floor" label="Floor" rules={[{ required: true }]}>
              <InputNumber min={0} precision={0} className="w-full" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  </Card>;
}
