import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Form, Select, Input, InputNumber, Button, message, Table, 
  Row, Col, Typography, ConfigProvider, theme, Skeleton, Space, Divider, Tag
} from 'antd';
import { 
  Newspaper, Plus, RefreshCw, ChevronLeft, ChevronRight, 
  History, GraduationCap, Receipt, Calendar, User, Save 
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;

// --- Specialized Skeleton for Bills ---
const BillSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton.Input active style={{ width: 200 }} />
        <Skeleton.Button active />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="circle" size="large" />
          <div className="flex-1">
            <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1, width: '70%' }} />
          </div>
          <Skeleton.Button active style={{ width: 100 }} />
        </div>
      ))}
    </div>
  </Card>
);

const PaperBillGenerator = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [recentFees, setRecentFees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(moment());

  // --- NAVIGATION HANDLERS ---
  const changeMonth = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'month'));
  const changeYear = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'year'));
  const handleToday = () => setSelectedDate(moment());

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsRes, feesRes] = await Promise.all([
        messAPI.getSessions(),
        messAPI.getStudentFees({ 
          fee_type: 'newspaper',
          month: selectedDate.month() + 1,
          year: selectedDate.year()
        })
      ]);
      setSessions(sessionsRes.data.data || []);
      setRecentFees(feesRes.data.data || []);
    } catch (error) {
      message.error('Failed to sync billing data');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [selectedDate]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        fee_type: 'newspaper',
        month: selectedDate.month() + 1,
        year: selectedDate.year(),
      };
      await messAPI.createBulkStudentFee(payload);
      message.success('Bulk paper bills applied successfully');
      form.resetFields(['description', 'amount']);
      fetchInitialData();
    } catch (error) {
      message.error(`Billing error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Student Beneficiary',
      key: 'student',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">{r.Student?.username}</Text>
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {moment(r.createdAt).format('DD MMM, HH:mm')}
          </Text>
        </Space>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
      render: (t) => <Text className="text-slate-500 text-xs italic">{t}</Text>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (amt) => <Text className="text-blue-600 font-bold">₹{parseFloat(amt).toFixed(2)}</Text>,
    },
    {
      title: 'Issued By',
      key: 'issuer',
      align: 'right',
      render: (_, r) => (
        <Tag bordered={false} icon={<User size={10} className="mr-1"/>} className="rounded-full px-3 text-[10px] uppercase font-bold">
          {r.IssuedBy?.username || 'System'}
        </Tag>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header with Navigation Controllers */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Newspaper className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Paper Bill Center</Title>
              <Text type="secondary">Generate and track newspaper subscriptions for sessions</Text>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Year Navigator */}
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeYear(-1)} />
              <div className="px-4 text-center min-w-[70px]"><Text strong className="text-slate-700">{selectedDate.format('YYYY')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeYear(1)} />
            </div>

            {/* Month Navigator */}
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeMonth(-1)} />
              <div className="px-6 text-center min-w-[120px]"><Text strong className="text-blue-600 uppercase tracking-wide">{selectedDate.format('MMMM')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeMonth(1)} />
            </div>

            <Button onClick={handleToday} className="rounded-2xl h-11 border-slate-200 text-slate-500 font-medium hover:text-blue-600">Today</Button>
          </div>
        </div>

        <Row gutter={24}>
          {/* Create Bill Form */}
          <Col xs={24} lg={9}>
            <Card className="border-none shadow-sm rounded-[32px] sticky top-8 p-2">
              <Title level={4} className="mb-6 flex items-center gap-2">
                <Receipt size={20} className="text-blue-600" /> Bill Configuration
              </Title>
              
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item name="session_id" label="Academic Session" rules={[{ required: true }]}>
                  <Select 
                    placeholder="Choose session" 
                    className="h-11 rounded-xl"
                    suffixIcon={<GraduationCap size={16} className="text-slate-400" />}
                  >
                    {sessions.map((s) => (
                      <Option key={s.id} value={s.id}>
                        {s.name} ({moment(s.start_date).format('YYYY')} - {moment(s.end_date).format('YYYY')})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="description" label="Service Description" rules={[{ required: true }]}>
                  <Input placeholder="e.g., Hindu & Indian Express - Oct" className="h-11 rounded-xl" />
                </Form.Item>

                <Form.Item name="amount" label="Monthly Rate per Student (₹)" rules={[{ required: true }]}>
                  <InputNumber min={1} className="w-full h-11 flex items-center rounded-xl" precision={2} prefix="₹" />
                </Form.Item>

                <Divider className="my-6 border-slate-100" />

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6 flex gap-3">
                  <Receipt size={20} className="text-blue-500 shrink-0 mt-1" />
                  <Text className="text-[11px] text-blue-700 leading-relaxed">
                    This will apply the specified amount as a **newspaper fee** to all students currently enrolled in the selected session for **{selectedDate.format('MMMM YYYY')}**.
                  </Text>
                </div>

                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  size="large" 
                  loading={submitting} 
                  icon={<Save size={18} />}
                  className="h-14 rounded-2xl shadow-lg shadow-blue-100 font-bold"
                >
                  Apply Bills to Session
                </Button>
              </Form>
            </Card>
          </Col>

          {/* History List */}
          <Col xs={24} lg={15}>
            {loading ? <BillSkeleton /> : (
              <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                <div className="p-6 pb-0 flex justify-between items-center">
                  <Title level={4} className="flex items-center gap-2 m-0">
                    <History size={20} className="text-blue-600" /> Billing History
                  </Title>
                  <Button icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>} onClick={fetchInitialData} type="text">Sync</Button>
                </div>
                <Divider className="my-4" />
                <Table 
                  columns={columns} 
                  dataSource={recentFees} 
                  rowKey="id" 
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 800 }}
                  locale={{ emptyText: <div className="p-12 text-slate-400">No paper bills recorded for this period.</div> }}
                />
              </Card>
            )}
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default PaperBillGenerator;