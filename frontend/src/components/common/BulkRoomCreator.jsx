import { PermissionButton as Button } from './PermissionControls';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, message } from 'antd';
import { adminAPI, wardenAPI } from '../../services/api';
import { ChevronLeft, ChevronRight, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { filterRooms, roomHasOccupants } from '../../utils/roomDirectory';
import { useScopeForm, useWorkspaceScope } from './WorkspaceScope';
import './RoomDirectory.css';

function RoomOccupancy({ room }) {
  const used = Number(room.occupancy_count) || 0;
  const capacity = Number(room.RoomType?.capacity) || 0;
  const full = capacity > 0 && used >= capacity;
  const segments = Math.min(capacity, 8);
  const filled = capacity ? Math.ceil(used * segments / capacity) : 0;
  return <span className="room-directory-occupancy">
    {segments > 0 && <span className="room-directory-meter" aria-hidden="true">
      {Array.from({ length: segments }, (_, index) => <span key={index} className={index < filled ? 'is-filled' : undefined} />)}
    </span>}
    <span>{used} / {capacity || '—'}</span>
    <span className="room-directory-badge">{full ? 'Full' : roomHasOccupants(room) ? 'Occupied' : 'Empty'}</span>
  </span>;
}

const roomPagination = {
  pageSize: 4,
  showSizeChanger: false,
  showLessItems: true,
  showTotal: (total, [first, last]) => `Showing ${first}–${last} of ${total} rooms`,
  itemRender: (_, type, original) => {
    if (type === 'prev') return React.cloneElement(original, {}, <span className="room-directory-page-link"><ChevronLeft size={14} aria-hidden="true" />Previous</span>);
    if (type === 'next') return React.cloneElement(original, {}, <span className="room-directory-page-link">Next<ChevronRight size={14} aria-hidden="true" /></span>);
    return original;
  },
};

export default function BulkRoomCreator({ isAdmin = false, onCreated, showRooms = false, triggerType = 'primary' }) {
  const api = isAdmin ? adminAPI : wardenAPI;
  const [form] = Form.useForm();
  const hostelId = Form.useWatch('hostel_id', form);
  const [open, setOpen] = useState(false);
  const [hostels, setHostels] = useState([]);
  const [types, setTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(showRooms);
  const [roomListError, setRoomListError] = useState('');
  const [roomPage, setRoomPage] = useState(1);
  const revision = useRef(0);
  const scope = useWorkspaceScope();
  const scopedHostel = isAdmin && scope?.kind === 'hostel' ? scope.id : undefined;
  useScopeForm(form, open, busy || deleting);
  const deletionHostel = scopedHostel || filters.hostel;
  const scopedTypes = types.filter(type => !isAdmin || Number(type.hostel_id) === Number(hostelId));
  const errorText = error => error.response?.data?.message || error.message || 'Unable to complete this action.';
  const visibleRooms = filterRooms(rooms, filters);
  const deletableRooms = visibleRooms.filter(room => !roomHasOccupants(room) && (!isAdmin || Boolean(deletionHostel)));
  const updateFilters = values => { setFilters(previous => ({ ...previous, ...values })); setSelected([]); setRoomPage(1); };
  const clearFilters = () => { setFilters({}); setSelected([]); setRoomPage(1); };

  const refreshRooms = async () => {
    if (showRooms) {
      setRoomsLoading(true);
      setRoomListError('');
      try {
        const response = await api.getRooms(scopedHostel ? { hostel_id: scopedHostel } : undefined);
        setRooms((response.data.data || []).filter(room => room.is_active !== false));
        setSelected([]);
      } catch (error) {
        setRoomListError(errorText(error));
        throw error;
      } finally { setRoomsLoading(false); }
    }
  };
  const confirmDelete = ids => {
    const targets = visibleRooms.filter(room => ids.includes(room.id));
    if (!targets.length) return;
    Modal.confirm({
      title: `Delete ${targets.length} room${targets.length === 1 ? '' : 's'}?`,
      content: targets.slice(0, 12).map(room => room.room_number).join(', ') + (targets.length > 12 ? ` and ${targets.length - 12} more` : ''),
      okText: 'Delete Rooms', okButtonProps: { danger: true },
      onOk: async () => {
        setDeleting(true);
        try {
          const response = await api.deleteBulkRooms({ room_ids: targets.map(room => room.id), ...(isAdmin ? { hostel_id: Number(deletionHostel) } : {}) });
          setRooms(previous => previous.filter(room => !targets.some(target => target.id === room.id)));
          setSelected([]);
          message.success(`Deleted ${response.data.data.deleted} rooms.`);
          try { await refreshRooms(); await onCreated?.(); }
          catch (error) { message.warning(`Rooms deleted. Refresh the list: ${errorText(error)}`); }
        } catch (error) {
          message.error(errorText(error));
          throw error;
        } finally { setDeleting(false); }
      }
    });
  };
  useEffect(() => {
    if (showRooms) refreshRooms().catch(() => {});
  }, [showRooms, api, scopedHostel]);

  const start = async () => {
    revision.current++;
    setPreview(null);
    setLoadError('');
    form.resetFields();
    if (scopedHostel) form.setFieldValue('hostel_id', scopedHostel);
    setOpen(true);
    setLoading(true);
    try {
      const [typeResponse, hostelResponse] = await Promise.all([
        api.getRoomTypes(), isAdmin ? adminAPI.getHostels() : Promise.resolve(null)
      ]);
      setTypes(typeResponse.data.data || []);
      setHostels(hostelResponse?.data?.data || []);
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const change = values => {
    revision.current++;
    setPreview(null);
    if (Object.hasOwn(values, 'hostel_id')) form.setFieldValue('room_type_id', undefined);
  };
  const previewRooms = async () => {
    try {
      const values = await form.validateFields();
      const current = revision.current;
      setBusy(true);
      const response = await api.previewBulkRooms(values);
      if (current === revision.current) setPreview({ ...response.data.data, values });
    } catch (error) {
      if (!error.errorFields) message.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  const createRooms = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const response = await api.createBulkRooms(preview.values);
      const data = response.data.data;
      message.success(`Created ${data.created} rooms; skipped ${data.skipped} existing rooms.`);
      setOpen(false);
      setPreview(null);
      // A list refresh failure should not be reported as a failed creation.
      try {
        await refreshRooms();
        await onCreated?.();
      } catch (error) {
        message.warning(`Rooms saved. Refresh the room list: ${errorText(error)}`);
      }
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  const roomColumns = [
    { title: 'Hostel', key: 'hostel', render: (_, room) => room.Hostel?.name || scope?.name || '—' },
    { title: 'Room Number', dataIndex: 'room_number', render: number => <strong className="room-directory-number">{number}</strong> },
    { title: 'Floor', dataIndex: 'floor' },
    { title: 'Room Type', render: (_, room) => room.RoomType?.name },
    { title: 'Occupancy', key: 'occupancy', render: (_, room) => <RoomOccupancy room={room} /> },
    { title: 'Actions', key: 'actions', align: 'right', render: (_, room) => <Button permissionAction="delete" danger type="text" icon={<Trash2 size={14} />} disabled={deleting || roomHasOccupants(room) || (isAdmin && !deletionHostel)} onClick={() => confirmDelete([room.id])}>Delete</Button> }
  ];

  return (
    <div>
      {showRooms ? <section className="room-directory" aria-labelledby="room-directory-heading">
        <div className="room-directory-controls">
          <div className="room-directory-heading">
            <h2 id="room-directory-heading">Room Directory <span className="room-directory-badge">{visibleRooms.length} / {rooms.length}</span></h2>
            <Button permissionAction="create" className="room-directory-create" icon={<Plus size={16} />} onClick={start}>Bulk Create Rooms</Button>
          </div>
          <div className="room-directory-filters">
            {isAdmin && !scopedHostel && <div><label htmlFor="directory-hostel">Hostel</label>
              <Select id="directory-hostel" aria-label="Filter hostel" allowClear placeholder="All hostels" value={filters.hostel} disabled={deleting} onChange={value => updateFilters({ hostel: value })}
                options={[...new Map(rooms.map(room => [room.hostel_id, { value: room.hostel_id, label: room.Hostel?.name || String(room.hostel_id) }])).values()]} />
            </div>}
            <div><label htmlFor="directory-number">Room number</label>
              <Input id="directory-number" aria-label="Search room number" prefix={<Search size={14} aria-hidden="true" />} allowClear placeholder="Search room number" value={filters.search || ''} disabled={deleting} onChange={event => updateFilters({ search: event.target.value })} />
            </div>
            <div><label htmlFor="directory-prefix">Room prefix</label>
              <Input id="directory-prefix" aria-label="Filter room prefix" allowClear placeholder="Prefix, e.g. S" value={filters.prefix || ''} disabled={deleting} onChange={event => updateFilters({ prefix: event.target.value })} />
            </div>
            <div><label htmlFor="directory-floor">Floor</label>
              <Select id="directory-floor" aria-label="Filter floor" allowClear placeholder="All floors" value={filters.floor} disabled={deleting} onChange={value => updateFilters({ floor: value })}
                options={[...new Set(rooms.map(room => room.floor).filter(value => value != null))].sort((a, b) => a - b).map(floor => ({ value: floor, label: `Floor ${floor}` }))} />
            </div>
            <div><label htmlFor="directory-type">Room type</label>
              <Select id="directory-type" aria-label="Filter room type" allowClear placeholder="All room types" value={filters.type} disabled={deleting} onChange={value => updateFilters({ type: value })}
                options={[...new Map(rooms.map(room => [room.room_type_id, { value: room.room_type_id, label: room.RoomType?.name || String(room.room_type_id) }])).values()]} />
            </div>
            <div><label htmlFor="directory-occupancy">Occupancy</label>
              <Select id="directory-occupancy" aria-label="Filter occupancy" allowClear placeholder="All occupancy" value={filters.occupancy} disabled={deleting} onChange={value => updateFilters({ occupancy: value })} options={[{ value: 'empty', label: 'Empty' }, { value: 'occupied', label: 'Occupied' }]} />
            </div>
            <div><label htmlFor="directory-from">Room number from</label>
              <InputNumber id="directory-from" placeholder="Number..." min={0} precision={0} value={filters.from} disabled={deleting} onChange={value => updateFilters({ from: value })} />
            </div>
            <div><label htmlFor="directory-to">Room number to</label>
              <InputNumber id="directory-to" placeholder="Number..." min={0} precision={0} value={filters.to} disabled={deleting} onChange={value => updateFilters({ to: value })} />
            </div>
            <Button icon={<RotateCcw size={15} />} disabled={deleting} onClick={clearFilters}>Clear Filters</Button>
          </div>
        </div>
        <div className="room-directory-selection">
          <Button permissionAction="delete" disabled={roomsLoading || deleting || !deletableRooms.length || deletableRooms.length > 500} onClick={() => setSelected(deletableRooms.map(room => room.id))}>Select Filtered Rooms</Button>
          <Button permissionAction="delete" danger icon={<Trash2 size={14} />} loading={deleting} disabled={!selected.length || selected.length > 500 || deleting} onClick={() => confirmDelete(selected)}>Delete Selected ({selected.length})</Button>
          <span role="status">{selected.length} {selected.length === 1 ? 'room' : 'rooms'} selected</span>
        </div>
        {roomListError && <div className="room-directory-controls"><Alert type="error" showIcon title={roomListError}
          action={<Button onClick={() => refreshRooms().catch(() => {})}>Retry</Button>} /></div>}
        <Table size="middle" rowKey="id" loading={roomsLoading} columns={roomColumns} dataSource={visibleRooms}
          locale={{ emptyText: roomListError ? 'Room directory unavailable.' : rooms.length ? 'No rooms match these filters.' : 'No rooms yet.' }}
          rowSelection={{ columnWidth: 52, selectedRowKeys: selected, onChange: keys => setSelected(keys), getCheckboxProps: room => ({ disabled: deleting || roomHasOccupants(room) || (isAdmin && !deletionHostel) }) }}
          pagination={{ ...roomPagination, current: roomPage, onChange: setRoomPage }} scroll={{ x: 750 }} />
      </section> : <Button type={triggerType} icon={<Plus size={17} />} onClick={start}>Bulk Create Rooms</Button>}
      <Modal title="Bulk Create Rooms" open={open} width={900} maskClosable={!busy} closable={!busy}
        onCancel={() => { if (!busy) { revision.current++; setOpen(false); } }}
        footer={<Space>
          <Button disabled={busy} onClick={() => { revision.current++; setOpen(false); }}>Cancel</Button>
          <Button onClick={previewRooms} loading={busy && !preview} disabled={busy || loading || Boolean(loadError)}>Preview Rooms</Button>
          <Button permissionAction="create" type="primary" onClick={createRooms} loading={busy && Boolean(preview)} disabled={!preview || preview.to_create === 0 || busy}>Create {preview?.to_create || ''} Rooms</Button>
        </Space>}>
        {loadError && <Alert type="error" showIcon title={loadError} />}
        <Form form={form} layout="vertical" initialValues={{ start_number: 1, end_number: 100, number_width: 0, floor: 0, prefix: '' }} onValuesChange={change} disabled={busy || loading || Boolean(loadError)}>
          <Row gutter={16}>
            {isAdmin && <Col xs={24} md={12}><Form.Item name="hostel_id" label="Hostel" rules={[{ required: true, message: 'Select a hostel' }]}>
              <Select disabled={Boolean(scopedHostel)} placeholder="Select hostel" options={hostels.map(hostel => ({ value: hostel.id, label: hostel.name }))} />
            </Form.Item></Col>}
            <Col xs={24} md={12}><Form.Item name="room_type_id" label="Room Type" rules={[{ required: true, message: 'Select a room type' }]}>
              <Select disabled={isAdmin && !hostelId} placeholder="Select room type" options={scopedTypes.map(type => ({ value: type.id, label: `${type.name} (${type.capacity} beds)` }))} />
            </Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="floor" label="Floor" rules={[{ required: true }, { type: 'integer', min: 0 }]}><InputNumber min={0} precision={0} className="w-full" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="prefix" label="Prefix (optional)"><Input maxLength={64} placeholder="e.g. S, G or A-" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="start_number" label="Start Number" rules={[{ required: true }, { type: 'integer', min: 0 }]}><InputNumber min={0} precision={0} className="w-full" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="end_number" label="End Number" rules={[{ required: true }, { type: 'integer', min: 0 }]}><InputNumber min={0} precision={0} className="w-full" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="number_width" label="Number Width" rules={[{ required: true }, { type: 'integer', min: 0, max: 10 }]}><InputNumber min={0} max={10} precision={0} className="w-full" /></Form.Item></Col>
          </Row>
        </Form>
        {preview && <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <span>{preview.hostel_name} · {preview.room_type_name} · Floor {preview.floor}</span>
            <span>{preview.to_create} new · {preview.skipped} existing</span>
          </div>
          <Table size="small" rowKey="room_number" dataSource={preview.rooms} pagination={{ pageSize: 10 }} columns={[
            { title: 'Room Number', dataIndex: 'room_number' },
            { title: 'Action', render: (_, room) => <Tag color={room.exists ? 'default' : 'green'}>{room.exists ? 'Skip existing' : 'Create'}</Tag> }
          ]} />
        </>}
      </Modal>
    </div>
  );
}
