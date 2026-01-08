import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Row, Col, Statistic, Button, Space, 
  Select, Divider, ConfigProvider, theme, Skeleton, Badge, 
  Tooltip, Tag, Input, Form, Empty, message, Radio
} from 'antd';
import { 
  MessageCircle, Send, RefreshCw, Filter, 
  Clock, CheckCircle2, AlertCircle, XCircle,
  Search, ShieldAlert, LifeBuoy, History, 
  Info, AlertTriangle, Layers, Zap, User, Calendar
} from 'lucide-react';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// --- Specialized Skeleton for Complaints ---
const ComplaintSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton.Input active style={{ width: 200 }} />
        <Skeleton.Button active />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-3 border-b border-slate-50 pb-6">
          <Skeleton active title={{ width: '30%' }} paragraph={{ rows: 2 }} />
          <div className="flex gap-2">
            <Skeleton.Button active size="small" style={{ width: 80 }} />
            <Skeleton.Button active size="small" style={{ width: 80 }} />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const ComplaintManagement = () => {
  const [form] = Form.useForm();
  
  // --- States ---
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // --- Fetch Logic ---
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getMyComplaints();
      setComplaints(response.data.data || []);
    } catch (error) {
      message.error('Failed to sync complaint logs');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  // --- Filtered Data ---
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesSearch = !searchText || 
        c.subject?.toLowerCase().includes(searchText.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchText.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [complaints, statusFilter, searchText]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await studentAPI.createComplaint(values);
      message.success('Complaint logged into our support system');
      form.resetFields();
      fetchComplaints();
    } catch (error) {
      message.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Status & Priority Configs ---
  const statusConfig = {
    resolved: { color: 'success', icon: <CheckCircle2 size={12} className="mr-1" />, label: 'Resolved' },
    in_progress: { color: 'processing', icon: <RefreshCw size={12} className="mr-1" />, label: 'In Progress' },
    submitted: { color: 'warning', icon: <Clock size={12} className="mr-1" />, label: 'Submitted' },
    closed: { color: 'default', icon: <XCircle size={12} className="mr-1" />, label: 'Closed' }
  };

  const priorityConfig = {
    urgent: { color: 'red', label: 'Urgent' },
    high: { color: 'orange', label: 'High' },
    medium: { color: 'blue', label: 'Medium' },
    low: { color: 'green', label: 'Low' }
  };

  const categoryConfig = {
    room: { color: 'cyan', label: 'Room' },
    mess: { color: 'green', label: 'Mess' },
    facility: { color: 'purple', label: 'Facility' },
    maintenance: { color: 'orange', label: 'Maintenance' },
    discipline: { color: 'red', label: 'Discipline' }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <LifeBuoy className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Support Desk</Title>
              <Text type="secondary">Report issues and track resolution timelines</Text>
            </div>
          </div>
          <Button icon={<RefreshCw size={16}/>} onClick={fetchComplaints} className="rounded-xl h-11">Sync Logs</Button>
        </div>

        {/* Global Statistics */}
        <Row gutter={[24, 24]}>
          {[
            { label: 'Total Logs', val: complaints.length, icon: Layers, color: 'text-slate-400' },
            { label: 'Awaiting Action', val: complaints.filter(c => c.status === 'submitted').length, icon: AlertCircle, color: 'text-orange-500' },
            { label: 'Under Review', val: complaints.filter(c => c.status === 'in_progress').length, icon: Clock, color: 'text-blue-500' },
            { label: 'Resolved Cases', val: complaints.filter(c => c.status === 'resolved').length, icon: CheckCircle2, color: 'text-emerald-500' },
          ].map((stat, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card className="border-none shadow-sm rounded-2xl">
                <Statistic 
                  title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{stat.label}</span>}
                  value={stat.val}
                  prefix={<stat.icon size={18} className={`${stat.color} mr-2`} />}
                  valueStyle={{ fontWeight: 800 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={24}>
          {/* New Complaint Form */}
          <Col lg={9} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] p-2 sticky top-8">
              <Title level={4} className="mb-6 flex items-center gap-2">
                <Zap size={20} className="text-blue-600" /> New Incident Report
              </Title>
              
              <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ priority: 'medium' }}>
                <Form.Item name="subject" label="Subject Header" rules={[{ required: true }]}>
                  <Input placeholder="Brief title of the issue..." className="h-11 rounded-xl" />
                </Form.Item>

                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                      <Select placeholder="Select Type" className="h-11 rounded-xl">
                        <Select.Option value="room">Room Issues</Select.Option>
                        <Select.Option value="mess">Mess/Food</Select.Option>
                        <Select.Option value="facility">Facilities</Select.Option>
                        <Select.Option value="maintenance">Maintenance</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                      <Select className="h-11 rounded-xl">
                        <Select.Option value="low">Low</Select.Option>
                        <Select.Option value="medium">Medium</Select.Option>
                        <Select.Option value="high">High</Select.Option>
                        <Select.Option value="urgent">Urgent</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label="Problem Description" rules={[{ required: true, min: 15 }]}>
                  <TextArea rows={5} placeholder="Provide specific details to help our team..." className="rounded-xl" />
                </Form.Item>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 mb-6">
                  <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-1" />
                  <Text className="text-[11px] text-amber-800 leading-relaxed">
                    Ensure details are factual. Providing specific room/table numbers helps us resolve issues faster.
                  </Text>
                </div>

                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  size="large" 
                  loading={submitting} 
                  icon={<Send size={18} />}
                  className="h-14 rounded-2xl shadow-lg shadow-blue-100 font-bold"
                >
                  Submit Report
                </Button>
              </Form>
            </Card>
          </Col>

          {/* History Feed */}
          <Col lg={15} xs={24} className="space-y-6">
            <Card className="border-none shadow-sm rounded-2xl">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 focus-within:border-blue-300 transition-all">
                  <Search size={18} className="text-slate-300" />
                  <Input 
                    placeholder="Search your logs..." 
                    bordered={false} 
                    value={searchText} 
                    onChange={e => setSearchText(e.target.value)} 
                  />
                </div>
                <Select value={statusFilter} onChange={setStatusFilter} className="w-40 h-10">
                  <Select.Option value="all">All Status</Select.Option>
                  <Select.Option value="submitted">Submitted</Select.Option>
                  <Select.Option value="in_progress">In Progress</Select.Option>
                  <Select.Option value="resolved">Resolved</Select.Option>
                </Select>
              </div>
            </Card>

            {loading ? <ComplaintSkeleton /> : filteredComplaints.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[32px] shadow-sm">
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description={<Text className="text-slate-400">No support logs matching your criteria</Text>} 
                />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredComplaints.map((c) => (
                  <Card key={c.id} className="border-none shadow-sm rounded-[32px] hover:shadow-md transition-all group overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Text strong className="text-lg text-slate-800">{c.subject}</Text>
                          <Tag 
                            icon={statusConfig[c.status]?.icon} 
                            color={statusConfig[c.status]?.color} 
                            className="rounded-full border-none px-3 font-bold uppercase text-[9px]"
                          >
                            {statusConfig[c.status]?.label}
                          </Tag>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                          <Tag color={categoryConfig[c.category]?.color || 'default'} className="m-0 border-none rounded-lg text-[10px] font-bold px-2">
                            {categoryConfig[c.category]?.label || c.category}
                          </Tag>
                          <Tag color={priorityConfig[c.priority]?.color} className="m-0 border-none rounded-lg text-[10px] font-bold px-2">
                            {priorityConfig[c.priority]?.label} PRIORITY
                          </Tag>
                        </div>

                        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }} className="text-slate-600 mb-4 bg-slate-50 p-4 rounded-2xl italic">
                          "{c.description}"
                        </Paragraph>

                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <Space><Calendar size={12}/> Reported: {moment(c.createdAt).format('DD MMM YYYY')}</Space>
                          {c.resolved_date && <Space className="text-emerald-500"><CheckCircle2 size={12}/> Resolved: {moment(c.resolved_date).format('DD MMM')}</Space>}
                          {c.AssignedTo && <Space><User size={12}/> Assigned: {c.AssignedTo.username}</Space>}
                        </div>

                        {c.resolution && (
                          <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                             <div className="flex items-center gap-2 mb-1">
                               <ShieldAlert size={14} className="text-emerald-600" />
                               <Text strong className="text-[10px] uppercase text-emerald-600">Official Resolution</Text>
                             </div>
                             <Text className="text-emerald-800 text-sm">{c.resolution}</Text>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default ComplaintManagement;