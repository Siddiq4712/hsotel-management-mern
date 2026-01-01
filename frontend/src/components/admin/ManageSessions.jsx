import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Button, Space, 
  Divider, ConfigProvider, theme, Skeleton, Badge, 
  Tag, Modal, Input, Empty, message, Form, 
  Table, Segmented, Tooltip, DatePicker
} from 'antd';
import { 
  Calendar, Plus, AlertCircle, 
  Edit3, Trash2, RefreshCw, LayoutGrid, Info, Inbox, 
  Settings2, Activity, List, AlignJustify, Maximize, 
  Square, Hash, Clock, CheckCircle2, Timer
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

const ManageSessions = () => {
  const [form] = Form.useForm();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [btnLoading, setBtnLoading] = useState(false);
  const [viewMode, setViewMode] = useState('tiles');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSessions();
      setSessions(response.data.data || []);
    } catch (error) {
      message.error('Timeline synchronization failed.');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // --- Helper: Status Logic ---
  const getSessionMeta = (session) => {
    const now = moment();
    const start = moment(session.start_date);
    const end = moment(session.end_date);
    const duration = end.diff(start, 'days');

    if (now.isBefore(start)) return { status: 'upcoming', label: 'Upcoming', color: 'blue', icon: <Timer size={14}/>, duration };
    if (now.isAfter(end)) return { status: 'ended', label: 'Concluded', color: 'default', icon: <CheckCircle2 size={14}/>, duration };
    return { status: 'active', label: 'Active Now', color: 'success', icon: <Activity size={14}/>, duration };
  };

  // --- Derived Stats ---
  const stats = useMemo(() => {
    const now = moment();
    const active = sessions.filter(s => now.isBetween(moment(s.start_date), moment(s.end_date))).length;
    const upcoming = sessions.filter(s => now.isBefore(moment(s.start_date))).length;
    return [
      { label: 'Total Registry', val: sessions.length, icon: Calendar, bg: 'bg-indigo-50', color: 'text-indigo-500' },
      { label: 'Active Windows', val: active, icon: Activity, bg: 'bg-emerald-50', color: 'text-emerald-500' },
      { label: 'Planned Sessions', val: upcoming, icon: Timer, bg: 'bg-blue-50', color: 'text-blue-500' },
    ];
  }, [sessions]);

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue({
        ...record,
        dates: [moment(record.start_date), moment(record.end_date)]
      });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleFinish = async (values) => {
    setBtnLoading(true);
    const payload = {
      name: values.name,
      start_date: values.dates[0].format('YYYY-MM-DD'),
      end_date: values.dates[1].format('YYYY-MM-DD'),
    };

    try {
      if (editingId) {
        await adminAPI.updateSession(editingId, payload);
        message.success('Session protocol updated.');
      } else {
        await adminAPI.createSession(payload);
        message.success('New timeline registered.');
      }
      setIsModalOpen(false);
      fetchSessions();
    } catch (error) {
      message.error(error.response?.data?.message || 'Update failed.');
    } finally {
      setBtnLoading(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Void Session Timeline?',
      icon: <AlertCircle className="text-rose-500 mr-2" strokeWidth={1.5} />,
      content: 'Archiving this session will affect all historical logs associated with this window.',
      okText: 'Confirm Deletion',
      okType: 'danger',
      onOk: async () => {
        try {
          await adminAPI.deleteSession(id);
          message.success('Registry purged.');
          fetchSessions();
        } catch (e) { message.error('Dependency error occurred.'); }
      }
    });
  };

  // --- VIEW RENDERERS ---

  const renderIconsView = () => (
    <Row gutter={[16, 16]}>
      {sessions.map(s => {
        const meta = getSessionMeta(s);
        return (
          <Col xs={12} sm={8} md={6} lg={4} key={s.id}>
            <div className="group bg-white p-6 rounded-3xl border border-transparent hover:border-blue-200 hover:shadow-xl transition-all flex flex-col items-center text-center cursor-pointer" onClick={() => handleOpenModal(s)}>
               <div className={`p-4 rounded-2xl mb-3 ${meta.status === 'active' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
                  <Calendar size={40} strokeWidth={1.2} />
               </div>
               <Text strong className="block truncate w-full">{s.name}</Text>
               <Text type="secondary" className="text-[10px] uppercase tracking-wider">{meta.label}</Text>
            </div>
          </Col>
        );
      })}
    </Row>
  );

  const renderTilesView = () => (
    <Row gutter={[20, 20]}>
      {sessions.map(s => {
        const meta = getSessionMeta(s);
        return (
          <Col xs={24} md={12} lg={8} key={s.id}>
            <Card className="border-none shadow-sm rounded-2xl hover:shadow-md transition-all overflow-hidden border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start">
                <Space size={12}>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={20}/></div>
                  <div>
                    <Text strong className="text-base block">{s.name}</Text>
                    <Text type="secondary" className="text-[11px]">{moment(s.start_date).format('MMM YYYY')} - {moment(s.end_date).format('MMM YYYY')}</Text>
                  </div>
                </Space>
                <div className="flex gap-1">
                  <Button type="text" size="small" icon={<Edit3 size={14}/>} onClick={() => handleOpenModal(s)} />
                  <Button type="text" size="small" danger icon={<Trash2 size={14}/>} onClick={() => handleDelete(s.id)} />
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <Tag color={meta.color} icon={meta.icon} className="rounded-full border-none px-3 m-0">{meta.label}</Tag>
                <Text className="text-xs text-slate-400 font-light"><Clock size={12} className="inline mr-1"/> {meta.duration} Days</Text>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );

  const renderListView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {sessions.map((s, idx) => {
        const meta = getSessionMeta(s);
        return (
          <div key={s.id} className={`flex items-center justify-between p-4 hover:bg-blue-50/50 transition-colors ${idx !== sessions.length - 1 ? 'border-b border-slate-50' : ''}`}>
             <Space size={16} className="flex-1">
                <Calendar size={18} className="text-slate-300" />
                <div className="w-48"><Text strong>{s.name}</Text></div>
                <Tag color={meta.color} className="rounded-full text-[10px] uppercase font-bold border-none px-3">{meta.label}</Tag>
                <Text type="secondary" className="text-xs italic">{moment(s.start_date).format('DD/MM/YY')} to {moment(s.end_date).format('DD/MM/YY')}</Text>
             </Space>
             <Space size={24}>
               <Text className="text-xs text-slate-400">{meta.duration} days</Text>
               <Space>
                 <Button type="text" size="small" icon={<Edit3 size={16}/>} onClick={() => handleOpenModal(s)} />
                 <Button type="text" size="small" danger icon={<Trash2 size={16}/>} onClick={() => handleDelete(s.id)} />
               </Space>
             </Space>
          </div>
        );
      })}
    </div>
  );

  const renderDetailsView = () => (
    <Table 
      dataSource={sessions} 
      rowKey="id"
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      pagination={{ pageSize: 10 }}
      columns={[
        { title: 'Session Protocol', dataIndex: 'name', render: (t) => <Text strong>{t}</Text> },
        { title: 'Window Starts', dataIndex: 'start_date', render: (d) => moment(d).format('DD MMM, YYYY') },
        { title: 'Window Ends', dataIndex: 'end_date', render: (d) => moment(d).format('DD MMM, YYYY') },
        { 
          title: 'Duration', 
          render: (_, r) => <span className="text-slate-400">{getSessionMeta(r).duration} Days</span> 
        },
        { 
          title: 'Status', 
          render: (_, r) => {
            const meta = getSessionMeta(r);
            return <Tag color={meta.color}>{meta.label.toUpperCase()}</Tag>;
          }
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
      {sessions.map(s => {
        const meta = getSessionMeta(s);
        return (
          <Card key={s.id} className="border-none shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
            <Row gutter={24} align="middle">
              <Col md={4} className="flex justify-center border-r border-slate-50">
                 <div className={`p-8 rounded-full ${meta.status === 'active' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                    <Calendar size={48} strokeWidth={1} />
                 </div>
              </Col>
              <Col md={14}>
                 <div className="flex items-center gap-3 mb-1">
                   <Title level={4} style={{ margin: 0 }}>{s.name}</Title>
                   <Tag color={meta.color}>{meta.label}</Tag>
                 </div>
                 <Space className="mb-3 text-slate-400 text-xs uppercase tracking-widest" split={<Divider type="vertical" />}>
                    <Space><Hash size={12}/> SID-{s.id}</Space>
                    <Space><Clock size={12}/> {meta.duration} Active Days</Space>
                 </Space>
                 <Paragraph className="text-slate-500 m-0 leading-relaxed font-light italic">
                   This institutional window runs from {moment(s.start_date).format('LL')} until {moment(s.end_date).format('LL')}.
                 </Paragraph>
              </Col>
              <Col md={6} className="text-right">
                 <div className="flex flex-col gap-2 p-4">
                   <Button type="primary" ghost className="rounded-xl h-11" onClick={() => handleOpenModal(s)}>Modify Timeline</Button>
                   <Button danger ghost className="rounded-xl h-11" onClick={() => handleDelete(s.id)}>Void Protocol</Button>
                 </div>
              </Col>
            </Row>
          </Card>
        );
      })}
    </div>
  );

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 14 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 rotate-3 transition-transform">
              <Calendar className="text-white" size={28} strokeWidth={1.5} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>Session Registry</Title>
              <Text type="secondary" className="font-light">Institutional timeline management and academic windows</Text>
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
            <Button icon={<RefreshCw size={16}/>} onClick={fetchSessions} type="text" className="rounded-xl">Sync</Button>
            <Button type="primary" icon={<Plus size={18}/>} onClick={() => handleOpenModal()} className="rounded-xl px-6 h-10 shadow-lg shadow-blue-100 border-none">Create Session</Button>
          </div>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <Skeleton active avatar paragraph={{ rows: 4 }} className="bg-white p-8 rounded-3xl" />
          </>
        ) : (
          <div className="animate-in fade-in duration-700">
            {/* Stats Cards */}
            <Row gutter={[20, 20]} className="mb-8">
              {stats.map((stat, i) => (
                <Col xs={24} md={8} key={i}>
                  <Card className="border-none shadow-sm rounded-[24px] p-5 bg-white hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                        <stat.icon size={20} strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col">
                        <Text className="text-[11px] uppercase text-slate-400 tracking-wider" style={{ fontWeight: 400 }}>{stat.label}</Text>
                        <Text className="text-2xl text-slate-700" style={{ fontWeight: 500, lineHeight: 1.2 }}>{stat.val}</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {sessions.length === 0 ? (
               <div className="py-24 flex flex-col items-center justify-center bg-white rounded-[32px] shadow-sm border border-slate-50">
                 <Empty image={<Inbox size={64} className="text-slate-200 mb-4" />} description="Timeline is currently empty." />
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

        {/* Action Modal */}
        <Modal
          title={
            <div className="flex items-center gap-3 py-2 border-b border-slate-50 w-full">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Settings2 size={20}/></div>
              <span className="font-semibold text-slate-700">{editingId ? 'Modify Session Timeline' : 'Initiate New Session'}</span>
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
            <Form.Item name="name" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Session Label</Text>} rules={[{ required: true }]}>
              <Input placeholder="e.g., Autumn Term 2025" className="h-12 bg-slate-50 border-none rounded-xl" />
            </Form.Item>
            
            <Form.Item name="dates" label={<Text strong className="text-[11px] text-slate-400 uppercase tracking-widest">Active Window Range</Text>} rules={[{ required: true, message: 'Please select duration' }]}>
              <DatePicker.RangePicker className="w-full h-12 bg-slate-50 border-none rounded-xl" />
            </Form.Item>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-3 mb-6">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <Text className="text-[11px] text-blue-600 leading-relaxed font-light">
                Sessions define the academic calendar limits. Changing dates may affect existing attendance and fee calculation protocols.
              </Text>
            </div>

            <div className="flex gap-3 mt-8">
              <Button onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-medium">Cancel</Button>
              <Button type="primary" block htmlType="submit" loading={btnLoading} className="flex-[2] h-12 rounded-xl font-semibold shadow-xl shadow-blue-100 border-none">
                {editingId ? 'Update Timeline' : 'Commit Protocol'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ManageSessions;