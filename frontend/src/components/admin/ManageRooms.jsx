import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Button, Space, 
  Divider, Skeleton, Badge, 
  Tag, Modal, Input, Empty, message, Form, InputNumber,
  Table, Segmented, Tooltip, Select
} from 'antd';
import { 
  Bed, Plus, Users, AlertCircle, 
  Edit3, Trash2, RefreshCw, LayoutGrid, Info, Inbox, 
  Settings2, Activity, List, AlignJustify, Maximize, 
  Square, Hash, Building, CheckCircle2, DoorOpen, Search
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

// --- Specialized Skeletons ---
const StatsSkeleton = () => (
  <Row gutter={[20, 20]} className="mb-8">
    {[...Array(3)].map((_, i) => (
      <Col xs={24} md={8} key={i}>
        <Card className="border-none shadow-sm rounded-[24px] p-5 bg-white">
          <div className="flex items-center gap-4">
            <Skeleton.Button active style={{ width: 44, height: 44, borderRadius: 12 }} />
            <div className="space-y-2 flex-1">
              <Skeleton.Input active size="small" style={{ width: '50%', height: 10 }} />
              <Skeleton.Input active size="small" style={{ width: '30%', height: 20 }} />
            </div>
          </div>
        </Card>
      </Col>
    ))}
  </Row>
);

// ✅ Added isTabbed prop
const ManageRooms = ({ isTabbed }) => {
  const [form] = Form.useForm();
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [btnLoading, setBtnLoading] = useState(false);
  const [viewMode, setViewMode] = useState('tiles');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, hostelsRes, typesRes] = await Promise.all([
        adminAPI.getRooms(),
        adminAPI.getHostels(),
        adminAPI.getRoomTypes()
      ]);
      setRooms(roomsRes.data.data || []);
      setHostels(hostelsRes.data.data || []);
      setRoomTypes(typesRes.data.data || []);
    } catch (error) {
      message.error('System synchronization failed.');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Derived Stats ---
  const stats = useMemo(() => {
    const occupied = rooms.filter(r => r.is_occupied).length;
    return [
      { label: 'Total Inventory', val: rooms.length, icon: DoorOpen, bg: 'bg-indigo-50', color: 'text-indigo-500' },
      { label: 'Occupied Units', val: occupied, icon: Users, bg: 'bg-rose-50', color: 'text-rose-500' },
      { label: 'Available Slots', val: rooms.length - occupied, icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-500' },
    ];
  }, [rooms]);

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue({
        ...record,
        hostel_id: record.hostel_id,
        room_type_id: record.room_type_id
      });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Decommission Room?',
      icon: <AlertCircle className="text-rose-500 mr-2" strokeWidth={1.5} />,
      content: 'This will permanently remove the room from the asset registry.',
      okText: 'Confirm Deletion',
      okType: 'danger',
      cancelText: 'Abort',
      onOk: async () => {
        try {
          await adminAPI.deleteRoom(id);
          message.success('Asset removed.');
          fetchData();
        } catch (e) { message.error('Conflict detected. Room may be occupied.'); }
      }
    });
  };

  const handleFinish = async (values) => {
    setBtnLoading(true);
    try {
      if (editingId) {
        await adminAPI.updateRoom(editingId, values);
        message.success('Asset data updated.');
      } else {
        await adminAPI.createRoom(values);
        message.success('New room registered.');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Transaction failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  // --- VIEW RENDERERS ---
  const renderIconsView = () => (
    <Row gutter={[16, 16]}>
      {rooms.map(room => (
        <Col xs={12} sm={8} md={6} lg={4} key={room.id}>
          <div className="group relative bg-white p-6 rounded-2xl border border-transparent hover:border-blue-200 hover:shadow-xl transition-all flex flex-col items-center text-center cursor-pointer" onClick={() => handleOpenModal(room)}>
             <div className={`p-4 rounded-2xl mb-3 transition-colors ${room.is_occupied ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                <DoorOpen size={40} strokeWidth={1.2} />
             </div>
             <Text strong className="block truncate w-full text-slate-700">Room {room.room_number}</Text>
             <Text type="secondary" className="text-[10px] uppercase">{room.Hostel?.name}</Text>
          </div>
        </Col>
      ))}
    </Row>
  );

  const renderTilesView = () => (
    <Row gutter={[20, 20]}>
      {rooms.map(room => (
        <Col xs={24} md={12} lg={8} key={room.id}>
          <Card className={`border-none shadow-sm rounded-2xl hover:shadow-md transition-all overflow-hidden border-l-4 ${room.is_occupied ? 'border-l-rose-400' : 'border-l-emerald-400'}`}>
            <div className="flex justify-between items-start">
              <Space align="start" size={12}>
                <div className={`p-2 rounded-lg ${room.is_occupied ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  <Bed size={20} />
                </div>
                <div>
                  <Text strong className="text-base block leading-tight">Room {room.room_number}</Text>
                  <Text type="secondary" className="text-[11px] uppercase tracking-tighter">{room.Hostel?.name} • Floor {room.floor}</Text>
                </div>
              </Space>
              <div className="flex gap-1">
                <Button type="text" size="small" icon={<Edit3 size={14}/>} onClick={() => handleOpenModal(room)} />
                <Button type="text" size="small" danger icon={<Trash2 size={14}/>} onClick={() => handleDelete(room.id)} />
              </div>
            </div>
            <div className="mt-4 flex justify-between items-end">
              <div>
                 <Text type="secondary" className="text-[10px] uppercase block mb-1">Classification</Text>
                 <Tag color="blue" className="rounded-md m-0">{room.RoomType?.name}</Tag>
              </div>
              <Badge status={room.is_occupied ? "error" : "success"} text={room.is_occupied ? "Occupied" : "Available"} className="text-[11px] font-medium" />
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderListView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {rooms.map((room, idx) => (
        <div key={room.id} className={`flex items-center justify-between p-4 hover:bg-blue-50/50 transition-colors ${idx !== rooms.length - 1 ? 'border-b border-slate-50' : ''}`}>
           <Space size={16} className="flex-1">
              <DoorOpen size={18} className={room.is_occupied ? "text-rose-400" : "text-emerald-400"} />
              <div className="w-24"><Text strong>#{room.room_number}</Text></div>
              <div className="w-40 flex items-center gap-2"><Building size={14} className="text-slate-400"/> <Text className="text-xs">{room.Hostel?.name}</Text></div>
              <Tag className="rounded-full border-none bg-slate-100 text-slate-600 px-3">{room.RoomType?.name}</Tag>
              <Text type="secondary" className="text-xs">Floor {room.floor}</Text>
           </Space>
           <Space size={24}>
             <Badge status={room.is_occupied ? "error" : "success"} text={room.is_occupied ? "Occupied" : "Available"} />
             <Space>
               <Button type="text" size="small" icon={<Edit3 size={16}/>} onClick={() => handleOpenModal(room)} />
               <Button type="text" size="small" danger icon={<Trash2 size={16}/>} onClick={() => handleDelete(room.id)} />
             </Space>
           </Space>
        </div>
      ))}
    </div>
  );

  const renderDetailsView = () => (
    <Table 
      dataSource={rooms} 
      rowKey="id"
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      pagination={{ pageSize: 10 }}
      columns={[
        { title: 'Room No.', dataIndex: 'room_number', key: 'room_number', render: (n) => <Text strong>Room {n}</Text> },
        { title: 'Hostel', dataIndex: ['Hostel', 'name'], key: 'hostel' },
        { title: 'Type', dataIndex: ['RoomType', 'name'], key: 'type', render: (t) => <Tag color="processing">{t}</Tag> },
        { title: 'Floor', dataIndex: 'floor', key: 'floor' },
        { 
          title: 'Status', 
          dataIndex: 'is_occupied', 
          key: 'status',
          render: (occ) => <Tag color={occ ? 'volcano' : 'green'} className="rounded-full">{occ ? 'Occupied' : 'Available'}</Tag>
        },
        { 
          title: 'Actions', 
          align: 'right',
          render: (_, record) => (
            <Space>
              <Button type="link" size="small" onClick={() => handleOpenModal(record)}>Edit</Button>
              <Button type="link" danger size="small" onClick={() => handleDelete(record.id)}>Void</Button>
            </Space>
          ) 
        }
      ]} 
    />
  );

  const renderContentView = () => (
    <div className="space-y-4">
      {rooms.map(room => (
        <Card key={room.id} className="border-none shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
          <Row gutter={24} align="middle">
            <Col md={4} className="flex justify-center border-r border-slate-50">
               <div className={`p-8 rounded-full ${room.is_occupied ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  <Bed size={48} strokeWidth={1} />
               </div>
            </Col>
            <Col md={14}>
               <div className="flex items-center gap-3 mb-1">
                 <Title level={4} style={{ margin: 0 }}>Room {room.room_number}</Title>
                 <Tag color={room.is_occupied ? "error" : "success"}>{room.is_occupied ? "Occupied" : "Available"}</Tag>
               </div>
               <Space className="mb-3 text-slate-400 text-xs uppercase tracking-widest" split={<Divider type="vertical" />}>
                  <Space><Building size={12}/> {room.Hostel?.name}</Space>
                  <Space><LayoutGrid size={12}/> Floor {room.floor}</Space>
                  <Space><Users size={12}/> Cap: {room.RoomType?.capacity}</Space>
               </Space>
               <Paragraph className="text-slate-500 m-0 leading-relaxed font-light italic">
                 Asset listed under {room.RoomType?.name} protocol. Status: {room.is_occupied ? 'Locked' : 'Ready for Allocation'}.
               </Paragraph>
            </Col>
            <Col md={6} className="text-right">
               <div className="flex flex-col gap-2 p-4">
                 <Button type="primary" ghost className="rounded-xl" onClick={() => handleOpenModal(room)}>Edit Asset</Button>
                 <Button danger ghost className="rounded-xl" onClick={() => handleDelete(room.id)}>Remove</Button>
               </div>
            </Col>
          </Row>
        </Card>
      ))}
    </div>
  );

  return (
    // ✅ Conditional padding depending on tab usage
    <div className={isTabbed ? "p-4" : "p-8 bg-slate-50 min-h-screen"}>

      {/* ✅ Hide header when inside tab */}
      {!isTabbed && (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 rotate-3 transition-transform">
              <Building className="text-white" size={28} strokeWidth={1.5} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>Room Registry</Title>
              <Text type="secondary" className="font-light">Manage physical assets and occupancy status</Text>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: <Tooltip title="Icons"><Square size={16} className="mt-1.5 mx-auto"/></Tooltip>, value: 'icons' },
                { label: <Tooltip title="Tiles"><LayoutGrid size={16} className="mt-1.5 mx-auto"/></Tooltip>, value: 'tiles' },
                { label: <Tooltip title="List"><AlignJustify size={16} className="mt-1.5 mx-auto"/></Tooltip>, value: 'list' },
                { label: <Tooltip title="Details"><List size={16} className="mt-1.5 mx-auto"/></Tooltip>, value: 'details' },
                { label: <Tooltip title="Content"><Maximize size={16} className="mt-1.5 mx-auto"/></Tooltip>, value: 'content' },
              ]}
              className="p-1 bg-slate-100 rounded-xl"
            />
            <Divider type="vertical" className="h-8" />
            <Button icon={<RefreshCw size={16}/>} onClick={fetchData} type="text" className="rounded-xl">Sync</Button>
            <Button type="primary" icon={<Plus size={18}/>} onClick={() => handleOpenModal()} className="rounded-xl px-6 h-10 shadow-lg shadow-blue-100 border-none">Create Room</Button>
          </div>
        </div>
      )}

      {loading ? (
        <>
          <StatsSkeleton />
          <Skeleton active avatar paragraph={{ rows: 4 }} className="bg-white p-8 rounded-3xl" />
        </>
      ) : (
        <div className="animate-in fade-in duration-700">
          <Row gutter={[20, 20]} className="mb-8">
            {stats.map((stat, i) => (
              <Col xs={24} md={8} key={i}>
                <Card className="border-none shadow-sm rounded-[24px] p-5 bg-white hover:bg-slate-50/50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                      <stat.icon size={20} strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col">
                      <Text className="text-[11px] uppercase text-slate-400 tracking-wider">{stat.label}</Text>
                      <Text className="text-2xl text-slate-700">{stat.val}</Text>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {rooms.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[32px] shadow-sm border border-slate-50">
              <Empty image={<Inbox size={64} className="text-slate-200 mb-4" />} description="Registry is currently empty." />
            </div>
          ) : (
            <>
              {viewMode === 'icons' && renderIconsView()}
              {viewMode === 'tiles' && renderTilesView()}
              {viewMode === 'list' && renderListView()}
              {viewMode === 'details' && renderDetailsView()}
              {viewMode === 'content' && renderContentView()}
            </>
          )}
        </div>
      )}

      <Modal
          title={
            <div className="flex items-center gap-3 py-2 border-b border-slate-50 w-full">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Settings2 size={20}/></div>
              <span className="font-semibold text-slate-700">{editingId ? 'Modify Room Asset' : 'Register New Room'}</span>
            </div>
          }
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={500}
          centered
          className="rounded-3xl overflow-hidden"
        >
          <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-6 px-2">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="hostel_id" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Target Hostel</Text>} rules={[{ required: true }]}>
                  <Select placeholder="Select Hostel" className="h-11 custom-select">
                    {hostels.map(h => <Select.Option key={h.id} value={h.id}>{h.name}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="room_type_id" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Room Classification</Text>} rules={[{ required: true }]}>
                  <Select placeholder="Select Type" className="h-11">
                    {roomTypes.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="room_number" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Room Identity</Text>} rules={[{ required: true }]}>
                  <Input placeholder="e.g., A-101" className="h-11 bg-slate-50 border-none rounded-xl" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="floor" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Level/Floor</Text>} rules={[{ required: true }]}>
                  <InputNumber min={0} className="w-full h-11 bg-slate-50 border-none rounded-xl flex items-center" />
                </Form.Item>
              </Col>
            </Row>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-3 mb-6">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <Text className="text-[11px] text-blue-600 leading-relaxed font-light">
                Registration will link this room to the selected hostel inventory. Allocation status defaults to 'Available' upon creation.
              </Text>
            </div>

            <div className="flex gap-3 mt-8">
              <Button onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-medium">Cancel</Button>
              <Button type="primary" block htmlType="submit" loading={btnLoading} className="flex-[2] h-12 rounded-xl font-semibold shadow-xl shadow-blue-100 border-none">
                {editingId ? 'Save Changes' : 'Confirm Registration'}
              </Button>
            </div>
          </Form>
        </Modal>

    </div>
  );
};

export default ManageRooms;
