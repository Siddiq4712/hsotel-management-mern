import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Form, Select, Input, InputNumber, Button, message, Table, 
  Row, Col, Typography, ConfigProvider, theme, Skeleton, Space, Divider, Tag, Popconfirm, Tooltip
} from 'antd';
import { 
  Newspaper, Plus, RefreshCw, ChevronLeft, ChevronRight, 
  History, GraduationCap, Receipt, Calendar, User, Save, Trash2, Info, AlertTriangle
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;

const PaperBillGenerator = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [rawFees, setRawFees] = useState([]); // Store individual records
  const [selectedDate, setSelectedDate] = useState(moment());

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
      setRawFees(feesRes.data.data || []);
    } catch (error) {
      message.error('Failed to sync billing data');
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, [selectedDate]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // --- POWER BI STYLE GROUPING LOGIC ---
  // Groups individual student fees into "Batches" based on description and time proximity
  const feeBatches = useMemo(() => {
    const batches = {};
    
    rawFees.forEach(fee => {
      // Create a unique key using description, amount, and the minute it was created
      const timeKey = moment(fee.createdAt).format('YYYY-MM-DD HH:mm');
      const batchKey = `${fee.description}-${fee.amount}-${timeKey}`;
      
      if (!batches[batchKey]) {
        batches[batchKey] = {
          key: batchKey,
          description: fee.description,
          amount: parseFloat(fee.amount),
          createdAt: fee.createdAt,
          issuedBy: fee.IssuedBy?.username,
          ids: [], // Store all individual record IDs for deletion
          studentCount: 0,
          totalValue: 0,
        };
      }
      
      batches[batchKey].ids.push(fee.id);
      batches[batchKey].studentCount += 1;
      batches[batchKey].totalValue += parseFloat(fee.amount);
    });

    return Object.values(batches).sort((a, b) => moment(b.createdAt).diff(moment(a.createdAt)));
  }, [rawFees]);

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
      message.success(`Successfully applied bills to session`);
      form.resetFields(['description', 'amount']);
      fetchInitialData();
    } catch (error) {
      message.error(`Billing error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // --- DELETE/UNDO BATCH LOGIC ---
  // Inside PaperBillGenerator.js

const handleDeleteBatch = async (batch) => {
  setLoading(true);
  try {
    // Using the new Bulk Delete API
    await messAPI.bulkDeleteStudentFees(batch.ids);
    
    message.success(`Step Reverted: "${batch.description}"`);
    message.info(`${batch.studentCount} student records were removed.`);
    fetchInitialData();
  } catch (error) {
    console.error(error);
    message.error('Failed to revert this batch. Please check network logs.');
  } finally {
    setLoading(false);
  }
};
  const columns = [
    {
      title: 'Applied Step / Batch',
      key: 'batch',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">{r.description}</Text>
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-slate-400" />
            <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {moment(r.createdAt).format('DD MMM, HH:mm')}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Impact',
      key: 'impact',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text className="text-xs text-slate-600">
            <User size={12} className="inline mr-1 mb-1" />
            {r.studentCount} Students
          </Text>
          <Text className="text-blue-600 font-bold">₹{r.totalValue.toFixed(2)} total</Text>
        </Space>
      )
    },
    {
      title: 'Rate',
      dataIndex: 'amount',
      render: (amt) => <Tag color="blue" className="rounded-full">₹{amt}/head</Tag>
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="View full logs for this action">
             <Button icon={<Info size={14}/>} type="text" shape="circle" />
          </Tooltip>
          <Popconfirm
            title="Undo this action?"
            description={`This will delete all ${r.studentCount} individual fee records created in this batch. This cannot be undone.`}
            onConfirm={() => handleDeleteBatch(r)}
            okText="Yes, Revert"
            cancelText="Cancel"
            okButtonProps={{ danger: true, icon: <RefreshCw size={14} /> }}
            icon={<AlertTriangle className="text-red-500" size={20} />}
          >
            <Button 
              danger 
              type="text" 
              icon={<Trash2 size={16} />} 
              className="hover:bg-red-50"
            >
              Revert
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Newspaper className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Paper Bill Center</Title>
              <Text type="secondary">Grouping individual records into "Applied Step" batches for easy correction</Text>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeYear(-1)} />
              <div className="px-4 text-center min-w-[70px]"><Text strong>{selectedDate.format('YYYY')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeYear(1)} />
            </div>
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <Button type="text" icon={<ChevronLeft size={16} />} onClick={() => changeMonth(-1)} />
              <div className="px-6 text-center min-w-[120px]"><Text strong className="text-blue-600 uppercase">{selectedDate.format('MMMM')}</Text></div>
              <Button type="text" icon={<ChevronRight size={16} />} onClick={() => changeMonth(1)} />
            </div>
          </div>
        </div>

        <Row gutter={24}>
          <Col xs={24} lg={8}>
            <Card className="border-none shadow-sm rounded-[32px] p-2">
              <Title level={4} className="mb-6 flex items-center gap-2">
                <Plus size={20} className="text-blue-600" /> New Applied Step
              </Title>
              
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item name="session_id" label="Target Batch/Session" rules={[{ required: true }]}>
                  <Select placeholder="Choose session" className="h-11 rounded-xl">
                    {sessions.map((s) => (
                      <Option key={s.id} value={s.id}>{s.name}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="description" label="Step Label (e.g. Hindu News)" rules={[{ required: true }]}>
                  <Input placeholder="This helps you identify the batch later" className="h-11 rounded-xl" />
                </Form.Item>

                <Form.Item name="amount" label="Amount per Student" rules={[{ required: true }]}>
                  <InputNumber min={0.01} className="w-full h-11 flex items-center rounded-xl" precision={2} prefix="₹" />
                </Form.Item>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6">
                  <Text className="text-[11px] text-amber-700 leading-relaxed block">
                    <AlertTriangle size={12} className="inline mr-1 mb-1" />
                    <strong>Note:</strong> If you make a mistake, you can use the <strong>"Revert"</strong> button in the history table to undo the entire bulk operation.
                  </Text>
                </div>

                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  size="large" 
                  loading={submitting} 
                  icon={<Save size={18} />}
                  className="h-14 rounded-2xl font-bold"
                >
                  Apply Billing Step
                </Button>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
              <div className="p-6 pb-2 flex justify-between items-center">
                <div>
                    <Title level={4} className="m-0">Applied Steps Log</Title>
                    <Text className="text-slate-400 text-xs">Manage groups of transactions as single actions</Text>
                </div>
                <Button 
                    icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>} 
                    onClick={fetchInitialData} 
                    type="text"
                >
                    Refresh
                </Button>
              </div>
              <Divider className="my-4" />
              <Table 
                columns={columns} 
                dataSource={feeBatches} 
                loading={loading}
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: "No billing batches found for this month." }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default PaperBillGenerator;