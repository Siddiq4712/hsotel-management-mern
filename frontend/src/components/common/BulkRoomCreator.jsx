import { PermissionButton as Button } from './PermissionControls';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, message } from 'antd';
import { adminAPI, wardenAPI } from '../../services/api';
import { DoorOpen, Plus, Trash2 } from 'lucide-react';
import { filterRooms, roomHasOccupants } from '../../utils/roomDirectory';
import { useScopeForm, useWorkspaceScope } from './WorkspaceScope';

export default function BulkRoomCreator({ isAdmin = false, onCreated, showRooms = false, templateAction }) {
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
  const [roomsLoading, setRoomsLoading] = useState(false);
  const revision = useRef(0);
  const scope = useWorkspaceScope();
  const scopedHostel = isAdmin && scope?.kind === 'hostel' ? scope.id : undefined;
  useScopeForm(form, open, busy || deleting);
  const deletionHostel = scopedHostel || filters.hostel;
  const scopedTypes = types.filter(type => !isAdmin || Number(type.hostel_id) === Number(hostelId));
  const errorText = error => error.response?.data?.message || error.message || 'Unable to complete this action.';
  const visibleRooms = filterRooms(rooms, filters);
  const deletableRooms = visibleRooms.filter(room => !roomHasOccupants(room) && (!isAdmin || Boolean(deletionHostel)));
  const updateFilters = values => { setFilters(previous => ({ ...previous, ...values })); setSelected([]); };

  const refreshRooms = async () => {
    if (showRooms) {
      setRoomsLoading(true);
      try {
        const response = await api.getRooms(scopedHostel ? { hostel_id: scopedHostel } : undefined);
        setRooms((response.data.data || []).filter(room => room.is_active !== false));
        setSelected([]);
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
    if (showRooms) refreshRooms().catch(error => message.error(errorText(error)));
  }, [showRooms, api]);

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
    ...(isAdmin ? [{ title: 'Hostel', render: (_, room) => room.Hostel?.name }] : []),
    { title: 'Room Number', dataIndex: 'room_number' },
    { title: 'Floor', dataIndex: 'floor' },
    { title: 'Room Type', render: (_, room) => room.RoomType?.name },
    { title: 'Occupancy', render: (_, room) => `${room.occupancy_count || 0} / ${room.RoomType?.capacity ?? '—'}` },
    { title: 'Actions', render: (_, room) => <Button danger type="text" icon={<Trash2 size={16} />} disabled={deleting || roomHasOccupants(room) || (isAdmin && !deletionHostel)} onClick={() => confirmDelete([room.id])}>Delete</Button> }
  ];

  return (
    <div>
      {showRooms ? <div className="flex flex-col gap-5 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><DoorOpen size={23} strokeWidth={1.8} /></span>
          <div>
            <h2 className="m-0 text-xl font-bold tracking-tight text-slate-900">Manage Rooms</h2>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center lg:shrink-0">
          {templateAction}
          <Button type="primary" size="large" icon={<Plus size={17} />} className="!rounded-xl !text-sm !font-semibold shadow-sm" onClick={start}>Bulk Create Rooms</Button>
        </div>
      </div> : <Button type="primary" icon={<Plus size={17} />} onClick={start}>Bulk Create Rooms</Button>}
      {showRooms && <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <h3 className="m-0 text-sm font-semibold text-slate-700">Room Directory</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{visibleRooms.length} / {rooms.length}</span>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isAdmin && !scopedHostel && <Select aria-label="Filter hostel" allowClear placeholder="Hostel" value={filters.hostel} disabled={deleting} onChange={value => updateFilters({ hostel: value })}
            options={[...new Map(rooms.map(room => [room.hostel_id, { value: room.hostel_id, label: room.Hostel?.name || String(room.hostel_id) }])).values()]} />}
          <Input aria-label="Search room number" allowClear placeholder="Search room number" value={filters.search || ''} disabled={deleting} onChange={event => updateFilters({ search: event.target.value })} />
          <Input aria-label="Filter room prefix" allowClear placeholder="Prefix, e.g. S" value={filters.prefix || ''} disabled={deleting} onChange={event => updateFilters({ prefix: event.target.value })} />
          <Select aria-label="Filter floor" allowClear placeholder="All floors" value={filters.floor} disabled={deleting} onChange={value => updateFilters({ floor: value })}
            options={[...new Set(rooms.map(room => room.floor).filter(value => value != null))].sort((a, b) => a - b).map(floor => ({ value: floor, label: `Floor ${floor}` }))} />
          <Select aria-label="Filter room type" allowClear placeholder="All room types" value={filters.type} disabled={deleting} onChange={value => updateFilters({ type: value })}
            options={[...new Map(rooms.map(room => [room.room_type_id, { value: room.room_type_id, label: room.RoomType?.name || String(room.room_type_id) }])).values()]} />
          <Select aria-label="Filter occupancy" allowClear placeholder="All occupancy" value={filters.occupancy} disabled={deleting} onChange={value => updateFilters({ occupancy: value })} options={[{ value: 'empty', label: 'Empty' }, { value: 'occupied', label: 'Occupied' }]} />
          <InputNumber aria-label="Room number from" placeholder="Number from" min={0} precision={0} className="w-full" value={filters.from} disabled={deleting} onChange={value => updateFilters({ from: value })} />
          <InputNumber aria-label="Room number to" placeholder="Number to" min={0} precision={0} className="w-full" value={filters.to} disabled={deleting} onChange={value => updateFilters({ to: value })} />
          <Button disabled={deleting} onClick={() => { setFilters({}); setSelected([]); }}>Clear Filters</Button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Button disabled={deleting || !deletableRooms.length || deletableRooms.length > 500} onClick={() => setSelected(deletableRooms.map(room => room.id))}>Select Filtered Rooms</Button>
          <Button danger icon={<Trash2 size={16} />} loading={deleting} disabled={!selected.length || selected.length > 500 || deleting} onClick={() => confirmDelete(selected)}>Delete Selected ({selected.length})</Button>
        </div>
        {rooms.length || roomsLoading ? <Table size="middle" rowKey="id" loading={roomsLoading} columns={roomColumns} dataSource={visibleRooms}
          rowSelection={{ selectedRowKeys: selected, onChange: keys => setSelected(keys), getCheckboxProps: room => ({ disabled: deleting || roomHasOccupants(room) || (isAdmin && !deletionHostel) }) }}
          pagination={{ pageSize: 10, hideOnSinglePage: true }} scroll={{ x: 750 }} />
          : <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400"><DoorOpen size={21} strokeWidth={1.7} /></span>
            <p className="m-0 text-sm font-semibold text-slate-700">No rooms yet</p>
            <p className="mt-1 mb-0 max-w-md text-sm leading-6 text-slate-500">Create a room template with the student capacity, then add your rooms using a prefix and number range.</p>
          </div>}
      </div>}
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
