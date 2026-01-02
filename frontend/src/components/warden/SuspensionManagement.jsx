import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Table, Tag, Button, Input, Select, DatePicker, 
  Typography, Row, Col, Statistic, Space, Skeleton, 
  Modal, Badge, Divider, Empty, message, ConfigProvider, theme, Form
} from 'antd';
import { 
  UserX, Plus, User, Calendar, CheckCircle2, AlertCircle, 
  Clock, XCircle, Search, RefreshCw, ShieldAlert,
  Gavel, Info, Inbox
} from 'lucide-react';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;

// --- 1. Specialized Stat Cards Skeleton ---
const StatsSkeleton = () => (
  <Row gutter={[24, 24]} className="mb-8">
    {[...Array(4)].map((_, i) => (
      <Col xs={24} sm={12} lg={6} key={i}>
        <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white">
          <div className="flex justify-between items-start mb-4">
            <Skeleton.Button active style={{ width: 48, height: 48, borderRadius: 16 }} />
            <Skeleton.Button active size="small" style={{ width: 60, borderRadius: 20 }} />
          </div>
          <div className="space-y-2">
            <Skeleton.Input active size="small" style={{ width: 100, height: 14 }} />
            <Skeleton.Input active block style={{ height: 38, marginTop: 8 }} />
          </div>
        </Card>
      </Col>
    ))}
  </Row>
);

// --- 2. Specialized Filter Hub Skeleton ---
const FilterSkeleton = () => (
  <Card className="border-none shadow-sm rounded-2xl mb-6 bg-white">
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex-1 md:max-w-md">
        <Skeleton.Input active block style={{ height: 48, borderRadius: 12 }} />
      </div>
      <Skeleton.Input active style={{ width: 200, height: 48, borderRadius: 12 }} />
      <div className="ml-auto">
        <Skeleton.Button active style={{ width: 48, height: 48, borderRadius: 12 }} />
      </div>
    </div>
  </Card>
);

// --- 3. Table Ledger Skeleton ---
const LedgerSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-6 p-6 border-b border-slate-50 last:border-0">
        <Skeleton.Avatar active shape="circle" size="large" />
        <div className="flex-1"><Skeleton active title={false} paragraph={{ rows: 1, width: '100%' }} /></div>
        <Skeleton.Input active style={{ width: 150 }} />
        <Skeleton.Button active style={{ width: 80 }} />
      </div>
    ))}
  </Card>
);

const SuspensionManagement = () => {
  const [form] = Form.useForm();
  const [suspensions, setSuspensions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [suspRes, stuRes] = await Promise.all([
        wardenAPI.getSuspensions(),
        wardenAPI.getStudents()
      ]);
      setSuspensions(suspRes.data.data || []);
      setStudents(stuRes.data.data || []);
    } catch (error) {
      message.error('Institutional disciplinary sync failed.');
    } finally {
      // Intentional delay to ensure smooth shimmer effect
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSuspensions = useMemo(() => {
    return suspensions.filter(s => 
      s.Student?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suspensions, searchTerm]);

  const statusConfig = {
    active: { color: 'error', icon: <AlertCircle size={12} />, label: 'Active' },
    completed: { color: 'success', icon: <CheckCircle2 size={12} />, label: 'Concluded' },
    cancelled: { color: 'default', icon: <XCircle size={12} />, label: 'Voided' }
  };

  const columns = [
    {
      title: 'Student Identity',
      key: 'identity',
      render: (_, r) => (
        <Space gap={3}>
          <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><User size={18} /></div>
          <Space direction="vertical" size={0}>
            <Text strong className="text-slate-700">{r.Student?.username}</Text>
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Roll: {r.Student?.roll_number || 'UNSET'}
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Action Status',
      dataIndex: 'status',
      render: (s) => (
        <Tag icon={statusConfig[s]?.icon} color={statusConfig[s]?.color} className="rounded-full border-none px-3 font-bold uppercase text-[9px]">
          {statusConfig[s]?.label || s}
        </Tag>
      )
    },
    {
      title: 'Total Impact',
      key: 'period',
      render: (_, r) => {
        const diff = r.end_date ? moment(r.end_date).diff(moment(r.start_date), 'days') : '∞';
        return <Text strong className="text-slate-500">{diff} Days</Text>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: () => <Button type="text" icon={<RefreshCw size={14}/>} className="text-slate-300" />
    }
  ];

  const handleCreateSuspension = async (values) => {
    setCreateLoading(true);
    try {
      await wardenAPI.createSuspension(values);
      message.success('Suspension order issued successfully.');
      setShowCreateModal(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.message || 'Failed to issue suspension order.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#f43f5e', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-600 rounded-2xl shadow-lg shadow-rose-100">
              <ShieldAlert className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Suspension Ledger</Title>
              <Text type="secondary">Institutional disciplinary oversight and protocol management</Text>
            </div>
          </div>
          <Button type="primary" icon={<Plus size={18}/>} onClick={() => setShowCreateModal(true)} className="h-12 rounded-xl px-6 font-bold bg-rose-600 border-none shadow-lg">Issue Order</Button>
        </div>

        {loading ? (
          <>
            <StatsSkeleton />
            <FilterSkeleton />
            <LedgerSkeleton />
          </>
        ) : (
          <>
            {/* Real Stat Cards */}
            <Row gutter={[24, 24]} className="mb-8">
              {[
                { label: 'Cumulative Records', val: suspensions.length, icon: Gavel, color: 'text-slate-400' },
                { label: 'Active Suspension', val: suspensions.filter(s => s.status === 'active').length, icon: UserX, color: 'text-rose-500' },
                { label: 'Concluded Actions', val: suspensions.filter(s => s.status === 'completed').length, icon: CheckCircle2, color: 'text-emerald-500' },
                { label: 'Protocol Holds', val: 0, icon: Clock, color: 'text-amber-500' },
              ].map((stat, i) => (
                <Col xs={24} sm={12} lg={6} key={i}>
                  <Card className="border-none shadow-sm rounded-[32px]">
                    <Statistic title={<span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{stat.label}</span>} value={stat.val} prefix={<stat.icon size={18} className={`${stat.color} mr-2`} />} valueStyle={{ fontWeight: 800 }} />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Real Filter Hub */}
            <Card className="border-none shadow-sm rounded-2xl mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 flex-1 md:max-w-md focus-within:border-rose-300 transition-all">
                  <Search size={18} className="text-slate-300" />
                  <Input placeholder="Search Roll or Incident..." bordered={false} className="w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Button icon={<RefreshCw size={16}/>} onClick={fetchData} className="rounded-xl h-12 w-12 flex items-center justify-center border-slate-200" />
              </div>
            </Card>

            {/* Real Table */}
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
              {filteredSuspensions.length > 0 ? (
                <Table 
                  dataSource={filteredSuspensions} 
                  columns={columns} 
                  rowKey="id" 
                  pagination={{ pageSize: 8, position: ['bottomCenter'] }} 
                />
              ) : (
                <div className="py-24 flex flex-col items-center justify-center bg-white">
                  <Empty image={<div className="bg-slate-50 p-8 rounded-full mb-4"><Inbox size={64} className="text-slate-200" /></div>} description={<Text className="text-slate-400 block">No disciplinary logs found.</Text>} />
                </div>
              )}
            </Card>
          </>
        )}

        {/* Create Suspension Modal */}
        <Modal
          title={<Title level={5} className="mb-0">Issue Suspension Order</Title>}
          open={showCreateModal}
          onCancel={() => {
            setShowCreateModal(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleCreateSuspension}>
            <Form.Item
              name="student_id"
              label="Student"
              rules={[{ required: true, message: 'Please select a student' }]}
            >
              <Select placeholder="Select a student" showSearch optionFilterProp="children">
                {students.map((student) => (
                  <Select.Option key={student.id} value={student.id}>
                    {student.username} - Roll: {student.roll_number || 'UNSET'}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="reason"
              label="Reason for Suspension"
              rules={[{ required: true, message: 'Please enter the reason' }]}
            >
              <TextArea rows={3} placeholder="Describe the violation or infraction..." />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="start_date"
                  label="Start Date"
                  rules={[{ required: true, message: 'Please select start date' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Select start date" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="end_date"
                  label="End Date (Optional)"
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Select end date" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="remarks" label="Additional Remarks">
              <TextArea rows={2} placeholder="Any further notes or conditions..." />
            </Form.Item>

            <Divider />

            <div className="flex justify-end gap-3 pt-4">
              <Button onClick={() => {
                setShowCreateModal(false);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={createLoading} className="bg-rose-600">
                Issue Order
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default SuspensionManagement;