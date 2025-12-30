import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Form, Select, DatePicker, Button, Typography, Row, Col, 
  Space, Divider, Table, Tag, Modal, Input, ConfigProvider, 
  theme, Skeleton, Badge, Tooltip, Empty, message 
} from 'antd';
import { 
  Calendar, FileText, Send, RefreshCw, Filter, 
  Eye, Info, ClipboardList, Clock, ShieldCheck, 
  CheckCircle2, XCircle, Search, ChevronRight, Inbox
} from 'lucide-react';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// --- Specialized Skeleton for Leave History ---
const LeaveSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton.Input active style={{ width: 200 }} />
        <Skeleton.Button active />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="circle" size="large" />
          <div className="flex-1"><Skeleton active paragraph={{ rows: 1 }} /></div>
          <Skeleton.Button active style={{ width: 80 }} />
        </div>
      ))}
    </div>
  </Card>
);

const LeaveManagement = () => {
  const [form] = Form.useForm();
  
  // --- States ---
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getMyLeaves();
      setLeaves(response.data.data || []);
    } catch (error) {
      message.error('Failed to sync leave history');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  // --- Live Filter Logic ---
  const filteredLeaves = useMemo(() => {
    return leaves.filter(leave => {
      const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
      const matchesSearch = !searchText || 
        leave.reason?.toLowerCase().includes(searchText.toLowerCase()) ||
        leave.leave_type?.toLowerCase().includes(searchText.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [leaves, statusFilter, searchText]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        leave_type: values.leave_type,
        from_date: values.dates[0].format('YYYY-MM-DD'),
        to_date: values.dates[1].format('YYYY-MM-DD'),
        reason: values.reason
      };
      await studentAPI.applyLeave(payload);
      message.success('Leave application submitted successfully');
      form.resetFields();
      fetchLeaves();
    } catch (error) {
      message.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Leave Details',
      key: 'details',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700 capitalize">{r.leave_type} Leave</Text>
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Applied {moment(r.createdAt).format('DD MMM')}
          </Text>
        </Space>
      )
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, r) => {
        const diff = moment(r.to_date).diff(moment(r.from_date), 'days') + 1;
        return (
          <Space direction="vertical" size={0}>
            <Text className="text-sm">{moment(r.from_date).format('MMM DD')} - {moment(r.to_date).format('MMM DD')}</Text>
            <Tag color="blue" className="m-0 border-none rounded-full px-2 text-[9px] font-bold">{diff} {diff === 1 ? 'DAY' : 'DAYS'}</Tag>
          </Space>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      align: 'center',
      render: (status) => {
        const config = {
          pending: { color: 'warning', icon: <Clock size={12} className="mr-1" /> },
          approved: { color: 'success', icon: <CheckCircle2 size={12} className="mr-1" /> },
          rejected: { color: 'error', icon: <XCircle size={12} className="mr-1" /> }
        };
        return (
          <Tag 
            icon={config[status]?.icon} 
            color={config[status]?.color} 
            className="rounded-full border-none px-3 font-bold uppercase text-[10px]"
          >
            {status}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      align: 'right',
      render: (_, r) => (
        <Button 
          icon={<Eye size={14}/>} 
          onClick={() => setSelectedLeave(r)}
          className="rounded-lg hover:bg-blue-50 border-none shadow-sm"
        />
      )
    }
  ];

  // --- No Data Render Logic ---
  const renderEmptyState = () => (
    <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[32px]">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-600 text-lg">No Leave Records Found</Text>
            <Text className="text-slate-400">
              {searchText || statusFilter !== 'all' 
                ? "No applications match your current filters." 
                : "You haven't submitted any leave applications yet."}
            </Text>
          </Space>
        }
      >
        {(searchText || statusFilter !== 'all') && (
          <Button 
            type="link" 
            onClick={() => { setSearchText(''); setStatusFilter('all'); }}
            className="text-blue-600 font-bold"
          >
            Clear All Filters
          </Button>
        )}
      </Empty>
    </div>
  );

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Leave Management</Title>
              <Text type="secondary">Submit absence requests and monitor approval lifecycle</Text>
            </div>
          </div>
        </div>

        <Row gutter={24}>
          {/* Form Section */}
          <Col lg={9} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] p-2 sticky top-8">
              <Title level={4} className="mb-6 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" /> New Application
              </Title>
              
              <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ leave_type: 'casual' }}>
                <Form.Item name="leave_type" label="Category" rules={[{ required: true }]}>
                  <Select className="h-11 rounded-xl">
                    <Option value="casual">Casual Leave</Option>
                    <Option value="sick">Sick/Medical</Option>
                    <Option value="emergency">Emergency</Option>
                    <Option value="vacation">Semester Break</Option>
                  </Select>
                </Form.Item>

                <Form.Item name="dates" label="Duration Range" rules={[{ required: true }]}>
                  <DatePicker.RangePicker className="w-full h-11 rounded-xl" disabledDate={c => c && c < moment().startOf('day')} />
                </Form.Item>

                <Form.Item name="reason" label="Detailed Reason" rules={[{ required: true, min: 10 }]}>
                  <TextArea rows={4} placeholder="Where are you going and why?" className="rounded-xl" />
                </Form.Item>

                <Divider className="my-6" />
                
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  size="large" 
                  loading={submitting} 
                  icon={<Send size={18} />}
                  className="h-14 rounded-2xl shadow-lg shadow-blue-100 font-bold"
                >
                  Submit Application
                </Button>
              </Form>
            </Card>
          </Col>

          {/* List Section */}
          <Col lg={15} xs={24} className="space-y-6">
            <Card className="border-none shadow-sm rounded-2xl">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 focus-within:border-blue-300 transition-all">
                  <Search size={18} className="text-slate-300" />
                  <Input 
                    placeholder="Live search by reason..." 
                    bordered={false} 
                    value={searchText} 
                    onChange={e => setSearchText(e.target.value)} 
                  />
                </div>
                <Select value={statusFilter} onChange={setStatusFilter} className="w-40 h-10">
                  <Option value="all">All Status</Option>
                  <Option value="pending">Pending</Option>
                  <Option value="approved">Approved</Option>
                  <Option value="rejected">Rejected</Option>
                </Select>
                <Button icon={<RefreshCw size={16}/>} onClick={fetchLeaves} className="rounded-xl h-10" />
              </div>
            </Card>

            {loading ? (
              <LeaveSkeleton />
            ) : filteredLeaves.length === 0 ? (
              renderEmptyState()
            ) : (
              <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                <Table 
                  columns={columns} 
                  dataSource={filteredLeaves} 
                  rowKey="id" 
                  pagination={{ pageSize: 7 }} 
                />
              </Card>
            )}
          </Col>
        </Row>

        {/* Details Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><ClipboardList size={20}/> Leave Dossier</div>}
          open={!!selectedLeave}
          onCancel={() => setSelectedLeave(null)}
          footer={<Button type="primary" onClick={() => setSelectedLeave(null)} className="rounded-xl h-10 px-8">Close</Button>}
          className="rounded-3xl"
        >
          {selectedLeave && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <Text className="text-[10px] uppercase font-bold text-slate-400 block">From</Text>
                  <Text strong>{moment(selectedLeave.from_date).format('LL')}</Text>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <Text className="text-[10px] uppercase font-bold text-slate-400 block">To</Text>
                  <Text strong>{moment(selectedLeave.to_date).format('LL')}</Text>
                </div>
              </div>
              
              <div>
                <Text className="text-[10px] uppercase font-bold text-slate-400 block mb-2 px-1">Applicant's Reason</Text>
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 italic text-slate-700">
                  "{selectedLeave.reason}"
                </div>
              </div>

              {selectedLeave.comment && (
                <div>
                  <Text className="text-[10px] uppercase font-bold text-rose-400 block mb-2 px-1">Administrative Remarks</Text>
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-rose-700">
                    {selectedLeave.comment}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default LeaveManagement;