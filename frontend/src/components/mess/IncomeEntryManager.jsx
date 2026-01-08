import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Form, Select, Input, InputNumber, Button, message, Table,DatePicker,
  Row, Col, Typography, ConfigProvider, theme, Skeleton, Space, Divider, Tag, Tooltip
} from 'antd';
import { 
  Wallet, Plus, RefreshCw, ChevronLeft, ChevronRight, 
  History, Receipt, Calendar, User, Save, Landmark, ArrowDownCircle
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

// --- Specialized Skeleton for Income Entries ---
const EntrySkeleton = () => (
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

const IncomeEntryManager = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recentEntries, setRecentEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(moment());

  // --- NAVIGATION HANDLERS ---
  const changeMonth = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'month'));
  const changeYear = (offset) => setSelectedDate(prev => prev.clone().add(offset, 'year'));
  const handleToday = () => setSelectedDate(moment());

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        month: selectedDate.month() + 1,
        year: selectedDate.year()
      };
      const response = await messAPI.getIncomeEntries(params);
      setRecentEntries(response.data.data || []);
    } catch (error) {
      message.error('Failed to sync financial entries');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [selectedDate]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      };
      await messAPI.createIncomeEntry(payload);
      message.success(`Entry for '${values.type}' successfully recorded`);
      form.resetFields(['amount', 'description']);
      fetchEntries();
    } catch (error) {
      message.error(`Entry error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Entry Details',
      key: 'details',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">{moment(r.received_date).format('DD MMM YYYY')}</Text>
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            ID: REC-{r.id}
          </Text>
        </Space>
      )
    },
    {
      title: 'Classification',
      dataIndex: ['IncomeType', 'name'],
      render: (type) => (
        <Tag bordered={false} className={`rounded-full px-3 font-bold text-[10px] uppercase ${
          type?.includes('Cash') ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
        }`}>
          {type}
        </Tag>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
      render: (t) => <Text className="text-slate-500 text-xs italic">{t || 'No details provided'}</Text>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (amt) => (
        <Text className="text-blue-600 font-bold text-base">
          ₹{parseFloat(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Auditor',
      key: 'auditor',
      align: 'right',
      render: (_, r) => (
        <Tooltip title="Recorded by">
          <Tag bordered={false} icon={<User size={10} className="mr-1"/>} className="rounded-full px-3 text-[10px] uppercase font-bold bg-slate-100">
            {r.IncomeReceivedBy?.username || 'Admin'}
          </Tag>
        </Tooltip>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header with Nav Controllers */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Wallet className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Income & Deductions</Title>
              <Text type="secondary">Manage Cash Tokens and Sister Concern credit billing</Text>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeYear(-1)} />
              <div className="px-4 text-center min-w-[70px]"><Text strong className="text-slate-700">{selectedDate.format('YYYY')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeYear(1)} />
            </div>

            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeMonth(-1)} />
              <div className="px-6 text-center min-w-[120px]"><Text strong className="text-blue-600 uppercase tracking-wide">{selectedDate.format('MMMM')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeMonth(1)} />
            </div>

            <Button onClick={handleToday} className="rounded-2xl h-11 border-slate-200 text-slate-500 font-medium hover:text-blue-600">Current</Button>
          </div>
        </div>

        <Row gutter={24}>
          {/* Form Side */}
          <Col xs={24} lg={8}>
            <Card className="border-none shadow-sm rounded-[32px] sticky top-8 p-2">
              <Title level={4} className="mb-6 flex items-center gap-2">
                <ArrowDownCircle size={20} className="text-blue-600" /> New Transaction
              </Title>
              
              <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ date: moment() }}>
                <Form.Item name="type" label="Income/Deduction Type" rules={[{ required: true }]}>
                  <Select placeholder="Select type" className="h-11 rounded-xl" suffixIcon={<Landmark size={16} className="text-slate-400" />}>
                    <Option value="Sister Concern Bill">Sister Concern (Credit Token)</Option>
                    <Option value="Cash Token">Cash Token (Less)</Option>
                  </Select>
                </Form.Item>

                <Form.Item name="date" label="Transaction Date" rules={[{ required: true }]}>
                  <DatePicker className="w-full h-11 rounded-xl" />
                </Form.Item>

                <Form.Item name="amount" label="Total Amount (₹)" rules={[{ required: true }]}>
                  <InputNumber min={0.01} className="w-full h-11 flex items-center rounded-xl" precision={2} prefix="₹" placeholder="0.00" />
                </Form.Item>

                <Form.Item name="description" label="Audit Remarks">
                  <TextArea rows={3} placeholder="e.g., Guest lunch meeting charges" className="rounded-xl" />
                </Form.Item>

                <Divider className="my-6 border-slate-100" />

                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  size="large" 
                  loading={submitting} 
                  icon={<Save size={18} />}
                  className="h-14 rounded-2xl shadow-lg shadow-blue-100 font-bold"
                >
                  Save Entry
                </Button>
              </Form>
            </Card>
          </Col>

          {/* Table Side */}
          <Col xs={24} lg={16}>
            {loading ? <EntrySkeleton /> : (
              <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                <div className="p-6 pb-0 flex justify-between items-center">
                  <Title level={4} className="flex items-center gap-2 m-0">
                    <History size={20} className="text-blue-600" /> Entry Logs
                  </Title>
                  <Button icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>} onClick={fetchEntries} type="text">Sync</Button>
                </div>
                <Divider className="my-4" />
                <Table 
                  columns={columns} 
                  dataSource={recentEntries} 
                  rowKey="id" 
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 800 }}
                  locale={{ emptyText: <div className="p-12 text-slate-400 text-center">No transactions recorded for {selectedDate.format('MMMM YYYY')}</div> }}
                />
              </Card>
            )}
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default IncomeEntryManager;