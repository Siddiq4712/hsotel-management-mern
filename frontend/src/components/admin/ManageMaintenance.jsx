import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, Space, 
  Select, Divider, ConfigProvider, theme, Skeleton, Badge, 
  Tag, Modal, Input, Empty, message, Form, Table 
} from 'antd';
import { 
  Wrench, Plus, CheckCircle2, AlertCircle, Calendar,XCircle,ClipboardList, 
  User, RefreshCw, Filter, Search, ShieldAlert,Info, 
  Clock, MapPin, Inbox, Send, Activity
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- Specialized Skeletons for Precise UI Matching ---

const StatsSkeleton = () => (
  <Row gutter={[20, 20]} className="mb-8">
    {[...Array(4)].map((_, i) => (
      <Col xs={24} sm={12} lg={6} key={i}>
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

const ManageMaintenance = () => {
  const [form] = Form.useForm();
  const [maintenance, setMaintenance] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [maintRes, hostelRes] = await Promise.all([
        adminAPI.getMaintenance(),
        adminAPI.getHostels()
      ]);
      setMaintenance(maintRes.data.data || []);
      setHostels(hostelRes.data.data || []);
    } catch (error) {
      message.error('Facility ledger synchronization failed.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateMaintenance = async (values) => {
    setCreateLoading(true);
    try {
      await adminAPI.createMaintenance({
        ...values,
        hostel_id: parseInt(values.hostel_id),
        room_id: values.room_id ? parseInt(values.room_id) : null,
      });
      
      message.success('Maintenance protocol initiated successfully.');
      setShowCreateModal(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Protocol violation: Creation failed');
    } finally {
      setCreateLoading(false);
    }
  };

  const priorityConfig = {
    urgent: { color: 'error', label: 'Urgent', bg: 'bg-rose-50', text: 'text-rose-600' },
    high: { color: 'warning', label: 'High', bg: 'bg-orange-50', text: 'text-orange-600' },
    medium: { color: 'processing', label: 'Medium', bg: 'bg-blue-50', text: 'text-blue-600' },
    low: { color: 'default', label: 'Low', bg: 'bg-slate-50', text: 'text-slate-600' }
  };

  const statusConfig = {
    reported: { color: 'warning', label: 'Reported', icon: <AlertCircle size={12} /> },
    in_progress: { color: 'processing', label: 'In Repair', icon: <Clock size={12} /> },
    completed: { color: 'success', label: 'Resolved', icon: <CheckCircle2 size={12} /> },
    cancelled: { color: 'default', label: 'Voided', icon: <XCircle size={12} /> }
  };

  const filteredData = useMemo(() => {
    return maintenance.filter(item => 
      item.issue_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.Hostel?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [maintenance, searchTerm]);

  const columns = [
    {
      title: 'Issue Identification',
      key: 'issue',
      render: (_, r) => (
        <Space gap={3}>
          <div className={`p-2 rounded-xl ${priorityConfig[r.priority].bg} ${priorityConfig[r.priority].text}`}>
            <Wrench size={18} />
          </div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700" style={{ fontWeight: 500 }}>{r.issue_type}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ref: #MNT-{r.id}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Hostel Unit',
      dataIndex: ['Hostel', 'name'],
      render: (name) => <Text className="text-xs text-slate-600">{name || 'General'}</Text>
    },
    {
      title: 'Workflow Status',
      dataIndex: 'status',
      render: (s) => (
        <Tag icon={statusConfig[s]?.icon} color={statusConfig[s]?.color} className="rounded-full border-none px-3 font-bold uppercase text-[9px]">
          {statusConfig[s]?.label || s}
        </Tag>
      )
    },
    {
      title: 'Protocol Info',
      key: 'reporter',
      render: (_, r) => (
        <div className="flex flex-col">
          <Space size={4} className="text-xs text-slate-600"><User size={12} strokeWidth={1.5}/> {r.ReportedBy?.username || 'System'}</Space>
          <Text className="text-[9px] text-slate-400 font-bold uppercase">{moment(r.createdAt).fromNow()}</Text>
        </div>
      )
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: () => <Button type="text" icon={<RefreshCw size={14}/>} className="text-slate-300 hover:text-blue-500" />
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Institutional Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-100">
              <Activity className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 400 }}>Facility Maintenance</Title>
              <Text type="secondary" style={{ fontWeight: 300 }}>Institutional oversight of hostel repair protocols and infrastructure health</Text>
            </div>
          </div>
          <Button 
            type="primary" 
            icon={<Plus size={18}/>} 
            onClick={() => setShowCreateModal(true)}
            className="h-10 rounded-lg px-6 font-medium shadow-sm border-none bg-blue-600"
          >
            Report Incident
          </Button>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <TableSkeleton />
          </>
        ) : (
          <>
            {/* Improved Non-Bold Stat Cards */}
            <Row gutter={[20, 20]} className="mb-8">
              {[
                { label: 'Total Incidents', val: maintenance.length, icon: ClipboardList, bg: 'bg-indigo-50', color: 'text-indigo-500' },
                { label: 'Active Repairs', val: maintenance.filter(m => m.status === 'in_progress').length, icon: Clock, bg: 'bg-blue-50', color: 'text-blue-500' },
                { label: 'Resolved Cases', val: maintenance.filter(m => m.status === 'completed').length, icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-500' },
                { label: 'Critical Ops', val: maintenance.filter(m => m.priority === 'urgent').length, icon: ShieldAlert, bg: 'bg-rose-50', color: 'text-rose-500' },
              ].map((stat, i) => (
                <Col xs={24} sm={12} lg={6} key={i}>
                  <Card className="border-none shadow-sm rounded-[24px] p-5 bg-white transition-all hover:bg-slate-50/50">
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

            {/* Filter Hub */}
            <Card className="border-none shadow-sm rounded-2xl mb-6 bg-white">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md focus-within:border-blue-300 transition-all">
                  <Search size={18} className="text-slate-300" />
                  <Input 
                    placeholder="Search by issue or unit..." 
                    bordered={false} 
                    className="w-full font-medium" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>} onClick={fetchData} className="rounded-lg h-10 w-10 flex items-center justify-center border-slate-200" />
              </div>
            </Card>

            {/* Data Ledger */}
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
              {filteredData.length > 0 ? (
                <Table 
                  dataSource={filteredData} 
                  columns={columns} 
                  rowKey="id" 
                  pagination={{ pageSize: 8, position: ['bottomCenter'], showSizeChanger: false }} 
                />
              ) : (
                <div className="py-24 flex flex-col items-center justify-center bg-white">
                  <Empty image={<div className="bg-slate-50 p-10 rounded-full mb-4"><Inbox size={64} className="text-slate-200" strokeWidth={1} /></div>} description={<Text className="text-slate-400 font-light block">No maintenance records found.</Text>} />
                </div>
              )}
            </Card>
          </>
        )}

        {/* Incident Reporting Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600" style={{ fontWeight: 400 }}><ShieldAlert size={18}/> Incident Reporting Protocol</div>}
          open={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          footer={null}
          className="rounded-2xl"
          width={500}
        >
          <Form form={form} layout="vertical" onFinish={handleCreateMaintenance} className="mt-6" initialValues={{ priority: 'medium' }}>
            <Form.Item name="hostel_id" label={<Text style={{ fontWeight: 500 }} className="text-xs text-slate-500 uppercase tracking-wider">Target Hostel Unit</Text>} rules={[{ required: true }]}>
              <Select placeholder="Select Institutional Unit" className="h-11 w-full">
                {hostels.map(h => <Option key={h.id} value={h.id}>{h.name}</Option>)}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="issue_type" label={<Text style={{ fontWeight: 500 }} className="text-xs text-slate-500 uppercase tracking-wider">Classification</Text>} rules={[{ required: true }]}>
                  <Input placeholder="e.g. Plumbing" className="h-11 rounded-lg" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="priority" label={<Text style={{ fontWeight: 500 }} className="text-xs text-slate-500 uppercase tracking-wider">Urgency Level</Text>} rules={[{ required: true }]}>
                  <Select className="h-11">
                    <Option value="low">Low Impact</Option>
                    <Option value="medium">Standard</Option>
                    <Option value="high">High Priority</Option>
                    <Option value="urgent">Critical Failure</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label={<Text style={{ fontWeight: 500 }} className="text-xs text-slate-500 uppercase tracking-wider">Diagnostic Details</Text>} rules={[{ required: true }]}>
              <TextArea rows={4} placeholder="Detail the physical failure or maintenance requirement..." className="rounded-lg p-3 border-slate-200" />
            </Form.Item>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 mb-6">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
              <Text className="text-[11px] text-blue-700 font-light leading-relaxed">Recording this incident notifies the relevant facility vendors and initiates the repair audit trail.</Text>
            </div>

            <Space className="w-full justify-end">
              <Button onClick={() => setShowCreateModal(false)} className="rounded-lg h-11 px-6">Abort</Button>
              <Button type="primary" htmlType="submit" loading={createLoading} className="h-11 rounded-lg px-8 font-medium shadow-sm bg-blue-600 border-none">Commit Record</Button>
            </Space>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ManageMaintenance;