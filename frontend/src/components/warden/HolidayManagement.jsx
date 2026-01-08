import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Table, Tag, Button, Input, Select, DatePicker, 
  Typography, Row, Col, Statistic, Space, Skeleton, 
  Modal, Badge, Divider, Empty, message, ConfigProvider, theme,Form
} from 'antd';
import { 
  CalendarDays, Plus, Calendar, CheckCircle2, AlertCircle, 
  Edit3, Trash2, Search, RefreshCw, Filter, 
  Info, Inbox, PartyPopper, History, Clock,ShieldCheck
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- 1. Specialized Skeletons (Precise UI Matching) ---

const StatsSkeleton = () => (
  <Row gutter={[24, 24]} className="mb-8">
    {[...Array(4)].map((_, i) => (
      <Col xs={24} sm={12} lg={6} key={i}>
        <Card className="border-none shadow-sm rounded-[32px] p-5 bg-white">
          <div className="flex items-center gap-4">
            <Skeleton.Button active style={{ width: 48, height: 48, borderRadius: 16 }} />
            <div className="space-y-2 flex-1">
              <Skeleton.Input active size="small" style={{ width: '60%', height: 12 }} />
              <Skeleton.Input active size="small" style={{ width: '40%', height: 24 }} />
            </div>
          </div>
        </Card>
      </Col>
    ))}
  </Row>
);

const FilterSkeleton = () => (
  <Card className="border-none shadow-sm rounded-2xl mb-6 bg-white">
    <div className="flex gap-4 items-center p-1">
      <Skeleton.Input active style={{ width: 300, height: 44, borderRadius: 12 }} />
      <Skeleton.Button active style={{ width: 44, height: 44, borderRadius: 12 }} />
    </div>
  </Card>
);

const TableSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-6 p-6 border-b border-slate-50 last:border-0">
        <Skeleton.Avatar active shape="square" size="large" />
        <div className="flex-1"><Skeleton active title={false} paragraph={{ rows: 1, width: '100%' }} /></div>
        <Skeleton.Input active style={{ width: 100 }} />
        <Skeleton.Button active style={{ width: 80 }} />
      </div>
    ))}
  </Card>
);

const HolidayManagement = () => {
  const [form] = Form.useForm();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const response = await wardenAPI.getHolidays();
      setHolidays(response.data.data || []);
    } catch (error) {
      message.error('Holiday registry synchronization failed.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  // --- Logic Helpers ---
  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => 
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.type.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => moment(a.date).unix() - moment(b.date).unix());
  }, [holidays, searchTerm]);

  const holidayTypeMeta = {
    national: { color: 'volcano', label: 'National', icon: <ShieldCheck size={12} /> },
    religious: { color: 'purple', label: 'Religious', icon: <PartyPopper size={12} /> },
    institutional: { color: 'blue', label: 'Institutional', icon: <Calendar size={12} /> },
    other: { color: 'cyan', label: 'Other', icon: <Info size={12} /> }
  };

  const getStatusTag = (date) => {
    const today = moment().startOf('day');
    const hDate = moment(date).startOf('day');
    if (hDate.isSame(today)) return <Tag color="blue" className="rounded-full border-none px-3 font-bold text-[9px]">TODAY</Tag>;
    if (hDate.isAfter(today)) return <Tag color="green" className="rounded-full border-none px-3 font-bold text-[9px]">UPCOMING</Tag>;
    return <Tag color="default" className="rounded-full border-none px-3 font-bold text-[9px]">PAST</Tag>;
  };

  // --- Handlers ---
  const handleOpenModal = (holiday = null) => {
    if (holiday) {
      setEditingId(holiday.id);
      form.setFieldsValue({ ...holiday, date: moment(holiday.date) });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setShowModal(true);
  };

  const handleSubmit = async (values) => {
    setModalLoading(true);
    const payload = { ...values, date: values.date.format('YYYY-MM-DD') };
    try {
      if (editingId) await wardenAPI.updateHoliday(editingId, payload);
      else await wardenAPI.createHoliday(payload);
      
      message.success(`Holiday registry updated successfully.`);
      setShowModal(false);
      fetchHolidays();
    } catch (e) {
      message.error(e.response?.data?.message || 'Update protocol failed.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Confirm Deletion',
      icon: <Trash2 className="text-rose-500 mr-2" size={22} />,
      content: 'This will remove the holiday from the institutional calendar. Proceed?',
      okText: 'Yes, Delete',
      okType: 'danger',
      className: 'rounded-3xl',
      onOk: async () => {
        try {
          await wardenAPI.deleteHoliday(id);
          message.success('Entry purged from registry.');
          fetchHolidays();
        } catch (e) { message.error('Deletion failed.'); }
      }
    });
  };

  const columns = [
    {
      title: 'Holiday Identity',
      key: 'name',
      render: (_, r) => (
        <Space gap={3}>
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><PartyPopper size={18} /></div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700">{r.name}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{moment(r.date).format('dddd')}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Date Protocol',
      dataIndex: 'date',
      render: (date) => (
        <div className="flex flex-col">
          <Text className="text-xs font-medium">{moment(date).format('DD MMM, YYYY')}</Text>
          <Text className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{moment(date).fromNow()}</Text>
        </div>
      )
    },
    {
      title: 'Classification',
      dataIndex: 'type',
      render: (t) => (
        <Tag color={holidayTypeMeta[t]?.color} className="rounded-full border-none px-3 font-bold uppercase text-[9px]">
          {holidayTypeMeta[t]?.label || t}
        </Tag>
      )
    },
    {
      title: 'Audit Status',
      key: 'status',
      render: (_, r) => getStatusTag(r.date)
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Button icon={<Edit3 size={14}/>} type="text" className="text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => handleOpenModal(r)} />
          <Button icon={<Trash2 size={14}/>} type="text" danger className="hover:bg-rose-50 rounded-lg" onClick={() => handleDelete(r.id)} />
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#059669', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Institutional Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100">
              <CalendarDays className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Holiday Registry</Title>
              <Text type="secondary">Institutional calendar management for hostel closures and events</Text>
            </div>
          </div>
          <Button 
            type="primary" 
            icon={<Plus size={18}/>} 
            onClick={() => handleOpenModal()}
            className="h-12 rounded-xl px-6 font-bold shadow-lg shadow-emerald-100 bg-emerald-600 border-none"
          >
            Add New Holiday
          </Button>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <FilterSkeleton />
            <TableSkeleton />
          </>
        ) : (
          <>
            {/* Glass-Glow Stat Cards */}
            <Row gutter={[24, 24]} className="mb-8">
              {[
                { label: 'Total Registry', val: holidays.length, icon: CalendarDays, bg: 'bg-emerald-50', color: 'text-emerald-600' },
                { label: 'Upcoming', val: holidays.filter(h => moment(h.date).isAfter(moment())).length, icon: Clock, bg: 'bg-blue-50', color: 'text-blue-600' },
                { label: 'Active Today', val: holidays.filter(h => moment(h.date).isSame(moment(), 'day')).length, icon: CheckCircle2, bg: 'bg-amber-50', color: 'text-amber-600' },
                { label: 'Historical', val: holidays.filter(h => moment(h.date).isBefore(moment(), 'day')).length, icon: History, bg: 'bg-slate-100', color: 'text-slate-500' },
              ].map((stat, i) => (
                <Col xs={24} sm={12} lg={6} key={i}>
                  <Card className="border-none shadow-sm rounded-[32px] p-5 bg-white group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                        <stat.icon size={22} />
                      </div>
                      <div className="flex flex-col">
                        <Text className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-tight">{stat.label}</Text>
                        <Text className="text-2xl font-black text-slate-800 leading-none mt-1">{stat.val}</Text>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Filter Toolbar */}
            <Card className="border-none shadow-sm rounded-2xl mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md focus-within:border-emerald-300 transition-all">
                  <Search size={18} className="text-slate-300" />
                  <Input placeholder="Search Holiday Name..." bordered={false} className="w-full font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Button icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>} onClick={fetchHolidays} className="rounded-xl h-12 w-12 flex items-center justify-center border-slate-200" />
              </div>
            </Card>

            {/* Ledger Table */}
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
              {filteredHolidays.length > 0 ? (
                <Table 
                  dataSource={filteredHolidays} 
                  columns={columns} 
                  rowKey="id" 
                  pagination={{ pageSize: 8, position: ['bottomCenter'], showSizeChanger: false }} 
                />
              ) : (
                <div className="py-24">
                  <Empty image={<div className="bg-slate-50 p-8 rounded-full inline-block mb-4"><Inbox size={64} className="text-slate-200" /></div>} description={<Text className="text-slate-400 block">No institutional holidays found.</Text>} />
                </div>
              )}
            </Card>
          </>
        )}

        {/* Action Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-emerald-600"><CalendarDays size={20}/> {editingId ? 'Modify Holiday Entry' : 'Create New Holiday'}</div>}
          open={showModal}
          onCancel={() => setShowModal(false)}
          footer={[
            <Button key="back" onClick={() => setShowModal(false)} className="rounded-xl h-11 px-8">Cancel</Button>,
            <Button key="submit" type="primary" loading={modalLoading} onClick={() => form.submit()} className="rounded-xl h-11 px-10 font-bold shadow-lg shadow-emerald-100 bg-emerald-600">Save</Button>
          ]}
          className="rounded-[32px]"
          width={500}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-6">
            <Form.Item name="name" label={<Text strong>Event / Holiday Name</Text>} rules={[{ required: true }]}>
              <Input placeholder="e.g. Independence Day" className="h-12 rounded-xl" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="date" label={<Text strong>Protocol Date</Text>} rules={[{ required: true }]}>
                  <DatePicker className="w-full h-12 rounded-xl" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="type" label={<Text strong>Holiday Class</Text>} rules={[{ required: true }]}>
                  <Select className="h-12 rounded-xl">
                    <Option value="national">National Holiday</Option>
                    <Option value="religious">Religious Holiday</Option>
                    <Option value="institutional">Institutional Holiday</Option>
                    <Option value="other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label={<Text strong>Institutional Description</Text>}>
              <TextArea rows={3} placeholder="Provide details regarding hostel mess or closure status..." className="rounded-2xl p-4 border-slate-200" />
            </Form.Item>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3">
              <Info size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <Text className="text-[11px] text-emerald-700 leading-tight">
                This entry will be visible in the student portal and reflected in the automated attendance calculations.
              </Text>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default HolidayManagement;