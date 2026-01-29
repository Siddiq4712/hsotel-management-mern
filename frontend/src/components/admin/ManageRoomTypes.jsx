import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, Space, 
  Divider, Skeleton, Badge, 
  Tag, Modal, Input, Empty, message, Form, InputNumber,
  Table, Segmented, Tooltip
} from 'antd';
import { 
  Bed, Plus, Users, AlertCircle, 
  Edit3, Trash2, RefreshCw, LayoutGrid, Info, Inbox, 
  Settings2, Activity, List, AlignJustify, Maximize, 
  Square, Calendar, Hash, ClipboardList
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

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
const ManageRoomTypes = ({ isTabbed }) => {
  const [form] = Form.useForm();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [btnLoading, setBtnLoading] = useState(false);
  
  const [viewMode, setViewMode] = useState('tiles');

  const fetchRoomTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getRoomTypes();
      setRoomTypes(response.data.data || []);
    } catch (error) {
      message.error('Registry sync failed.');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  useEffect(() => { fetchRoomTypes(); }, [fetchRoomTypes]);

  const stats = useMemo(() => {
    const capacities = roomTypes.map(r => r.capacity || 0);
    return [
      { label: 'Registry Size', val: roomTypes.length, icon: ClipboardList, bg: 'bg-indigo-50', color: 'text-indigo-500' },
      { label: 'Max Occupancy', val: capacities.length > 0 ? Math.max(...capacities) : 0, icon: Users, bg: 'bg-blue-50', color: 'text-blue-500' },
      { label: 'Global Configurations', val: new Set(roomTypes.map(r => r.name)).size, icon: Activity, bg: 'bg-emerald-50', color: 'text-emerald-500' },
    ];
  }, [roomTypes]);

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Void Room Type?',
      icon: <AlertCircle className="text-rose-500 mr-2" strokeWidth={1.5} />,
      content: 'This will remove the room configuration from the institutional registry.',
      okText: 'Confirm Deletion',
      okType: 'danger',
      cancelText: 'Abort',
      onOk: async () => {
        try {
          await adminAPI.deleteRoomType(id);
          message.success('Entry purged.');
          fetchRoomTypes();
        } catch (e) { message.error('Dependency error occurred.'); }
      }
    });
  };

  const handleFinish = async (values) => {
    setBtnLoading(true);
    try {
      if (editingId) {
        await adminAPI.updateRoomType(editingId, values);
        message.success('Inventory updated.');
      } else {
        await adminAPI.createRoomType(values);
        message.success('New template deployed.');
      }
      setIsModalOpen(false);
      fetchRoomTypes();
    } catch (error) {
      message.error('Action failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  // --- VIEW RENDERERS ---
  const renderIconsView = () => (
    <Row gutter={[16, 16]}>
      {roomTypes.map(type => (
        <Col xs={12} sm={8} md={6} lg={4} key={type.id}>
          <div className="group relative bg-white p-6 rounded-2xl border border-transparent hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all flex flex-col items-center text-center cursor-pointer" onClick={() => handleOpenModal(type)}>
             <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mb-3">
                <Bed size={40} strokeWidth={1.2} />
             </div>
             <Text strong className="block truncate w-full text-slate-700">{type.name}</Text>
             <Text type="secondary" className="text-[10px] uppercase">Cap: {type.capacity}</Text>
          </div>
        </Col>
      ))}
    </Row>
  );

  const renderTilesView = () => (
    <Row gutter={[20, 20]}>
      {roomTypes.map(type => (
        <Col xs={24} md={12} lg={8} key={type.id}>
          <Card className="border-none shadow-sm rounded-2xl hover:shadow-md transition-all overflow-hidden border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start">
              <Space align="start" size={12}>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Bed size={20} />
                </div>
                <div>
                  <Text strong className="text-base block leading-tight">{type.name}</Text>
                  <Text type="secondary" className="text-[11px]">ID: #TPL-{type.id}</Text>
                </div>
              </Space>
              <div className="flex gap-1">
                <Button type="text" size="small" icon={<Edit3 size={14}/>} onClick={() => handleOpenModal(type)} />
                <Button type="text" size="small" danger icon={<Trash2 size={14}/>} onClick={() => handleDelete(type.id)} />
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <div className="flex-1">
                 <Text type="secondary" className="text-[10px] uppercase block mb-1">Capacity</Text>
                 <Tag color="blue" className="rounded-md m-0">{type.capacity} Pax</Tag>
              </div>
              <div className="flex-[2]">
                 <Text type="secondary" className="text-[10px] uppercase block mb-1">Description</Text>
                 <Paragraph ellipsis={{ rows: 1 }} className="text-xs m-0 text-slate-500 font-light">{type.description || 'No notes.'}</Paragraph>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderListView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {roomTypes.map((type, idx) => (
        <div key={type.id} className={`flex items-center justify-between p-4 hover:bg-blue-50/50 transition-colors ${idx !== roomTypes.length - 1 ? 'border-b border-slate-50' : ''}`}>
           <Space size={16}>
              <Bed size={18} className="text-slate-400" />
              <Text strong className="min-w-[150px]">{type.name}</Text>
              <Tag className="rounded-full border-none bg-slate-100 text-slate-600 px-3">{type.capacity} Persons</Tag>
              <Text type="secondary" className="text-xs italic truncate max-w-md">{type.description}</Text>
           </Space>
           <Space>
             <Button type="text" size="small" icon={<Edit3 size={16}/>} onClick={() => handleOpenModal(type)} />
             <Button type="text" size="small" danger icon={<Trash2 size={16}/>} onClick={() => handleDelete(type.id)} />
           </Space>
        </div>
      ))}
    </div>
  );

  const renderDetailsView = () => (
    <Table 
      dataSource={roomTypes} 
      rowKey="id"
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      pagination={false}
      columns={[
        { title: 'Template Name', dataIndex: 'name', render: (t) => <Text strong color="blue">{t}</Text> },
        { title: 'Capacity', dataIndex: 'capacity', render: (c) => <Badge count={c} color="#3b82f6" overflowCount={10} /> },
        { title: 'Description', dataIndex: 'description', ellipsis: true },
        { title: 'Date Created', dataIndex: 'createdAt', render: (d) => moment(d).format('MMM DD, YYYY') },
        { 
          title: 'Actions', 
          key: 'action', 
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
      {roomTypes.map(type => (
        <Card key={type.id} className="border-none shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
          <Row gutter={24} align="middle">
            <Col md={4} className="flex justify-center border-r border-slate-50">
               <div className="p-8 bg-slate-50 rounded-full text-blue-500">
                  <Bed size={48} strokeWidth={1} />
               </div>
            </Col>
            <Col md={14}>
               <Title level={4} className="mb-1">{type.name}</Title>
               <Space className="mb-3 text-slate-400 text-xs uppercase tracking-widest">
                  <Hash size={12}/> TPL-{type.id} <Divider type="vertical" /> <Users size={12}/> Capacity: {type.capacity}
               </Space>
               <Paragraph className="text-slate-500 m-0 leading-relaxed font-light italic">
                 "{type.description || 'System standard room configuration with default institutional amenities.'}"
               </Paragraph>
            </Col>
            <Col md={6} className="text-right">
               <div className="flex flex-col gap-2 p-4">
                 <Button type="primary" ghost icon={<Edit3 size={14}/>} className="rounded-xl" onClick={() => handleOpenModal(type)}>Modify Template</Button>
                 <Button danger ghost icon={<Trash2 size={14}/>} className="rounded-xl" onClick={() => handleDelete(type.id)}>Delete Entry</Button>
               </div>
            </Col>
          </Row>
        </Card>
      ))}
    </div>
  );

  return (
    // ✅ Conditional padding based on tab usage
    <div className={isTabbed ? "p-4" : "p-8 bg-slate-50 min-h-screen"}>

      {/* ✅ Hide header when inside tab */}
      {!isTabbed && (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 rotate-3 transition-transform">
              <LayoutGrid className="text-white" size={28} strokeWidth={1.5} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>Room Infrastructure</Title>
              <Text type="secondary" className="font-light">Institutional room specifications and occupancy templates</Text>
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
            <Button icon={<RefreshCw size={16}/>} onClick={fetchRoomTypes} type="text" className="rounded-xl">Sync</Button>
            <Button type="primary" icon={<Plus size={18}/>} onClick={() => handleOpenModal()} className="rounded-xl px-6 h-10 shadow-lg shadow-blue-100 border-none">Create Template</Button>
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

          {roomTypes.length === 0 ? (
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

      {/* Modal remains unchanged */}
      <Modal
        title={
          <div className="flex items-center gap-3 py-2 border-b border-slate-50 w-full">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Settings2 size={20}/></div>
            <span className="font-semibold text-slate-700">{editingId ? 'Modify Template' : 'Register Template'}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={450}
        centered
        className="rounded-3xl overflow-hidden"
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-6 px-2">
          <Form.Item name="name" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Template Label</Text>} rules={[{ required: true }]}>
            <Input placeholder="e.g., Executive Suite" className="h-12 bg-slate-50 border-none rounded-xl focus:bg-white transition-all" />
          </Form.Item>
          
          <Form.Item name="capacity" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Pax Capacity</Text>} rules={[{ required: true }]}>
            <InputNumber min={1} max={12} className="w-full h-12 bg-slate-50 border-none rounded-xl flex items-center" />
          </Form.Item>

          <Form.Item name="description" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Internal Remarks</Text>}>
            <TextArea rows={4} placeholder="Specifications..." className="bg-slate-50 border-none rounded-xl focus:bg-white transition-all p-4" />
          </Form.Item>

          <div className="flex gap-3 mt-8">
            <Button onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-medium border-slate-200">Cancel</Button>
            <Button type="primary" block htmlType="submit" loading={btnLoading} className="flex-[2] h-12 rounded-xl font-semibold shadow-xl shadow-blue-100 border-none">
              {editingId ? 'Update Template' : 'Deploy Template'}
            </Button>
          </div>
        </Form>
      </Modal>

    </div>
  );
};

export default ManageRoomTypes;
