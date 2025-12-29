import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Form, Button, Input, Select, DatePicker, Table, 
  Typography, Space, Modal, Row, Col, Tag, Popconfirm, 
  Divider, Skeleton, ConfigProvider, theme, List, message,InputNumber
} from 'antd';
import { 
  CreditCard, Plus, Edit3, Trash2, Search, 
  LayoutGrid, RefreshCw, X, AlertCircle, CheckCircle2
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

// --- Specialized Skeleton for Expenses ---
const ExpenseSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton.Input active style={{ width: 250 }} />
        <Skeleton.Button active style={{ width: 120 }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="square" size="large" />
          <div className="flex-1">
            <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1, width: '20%' }} />
          </div>
          <Skeleton.Button active style={{ width: 80 }} />
        </div>
      ))}
    </div>
  </Card>
);

const MessExpenses = () => {
  const [form] = Form.useForm();
  const [typeForm] = Form.useForm();
  
  // --- States ---
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, expensesRes] = await Promise.all([
        messAPI.getExpenseTypes(),
        messAPI.getMessDailyExpenses()
      ]);
      setExpenseTypes(typesRes.data.data || []);
      setDailyExpenses(expensesRes.data.data || []);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Daily Expense Handlers ---
  const handleDailySubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        expense_date: values.expense_date.format('YYYY-MM-DD')
      };
      if (editingId) {
        await messAPI.updateMessDailyExpense(editingId, payload);
        message.success('Expense updated successfully');
      } else {
        await messAPI.createMessDailyExpense(payload);
        message.success('Expense added successfully');
      }
      form.resetFields();
      setEditingId(null);
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExpense = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      expense_date: moment(record.expense_date)
    });
  };

  // --- Expense Type Handlers ---
  const handleTypeSubmit = async (values) => {
    try {
      if (editingType) {
        await messAPI.updateExpenseType(editingType.id, values);
        message.success('Category updated');
      } else {
        await messAPI.createExpenseType(values);
        message.success('Category created');
      }
      typeForm.resetFields();
      setEditingType(null);
      setShowTypeModal(false);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || 'Action failed');
    }
  };

  const columns = [
    {
      title: 'Date & Category',
      key: 'info',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">{moment(r.expense_date).format('DD MMM YYYY')}</Text>
          <Tag color="blue" className="rounded-full px-3 py-0 border-none text-[10px] font-bold uppercase tracking-wider">
            {r.ExpenseType?.name || 'General'}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (val) => <Text className="text-blue-600 font-bold">₹{parseFloat(val).toFixed(2)}</Text>,
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
      render: (text) => <Text className="text-slate-500 italic text-xs">{text || '—'}</Text>
    },
    {
      title: 'Actions',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Button icon={<Edit3 size={14}/>} onClick={() => handleEditExpense(r)} className="rounded-lg h-8" />
          <Popconfirm title="Delete this record?" onConfirm={() => messAPI.deleteMessDailyExpense(r.id).then(fetchData)}>
            <Button danger icon={<Trash2 size={14}/>} className="rounded-lg h-8" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <CreditCard className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Mess Operations</Title>
              <Text type="secondary">Track miscellaneous expenses and financial overheads</Text>
            </div>
          </div>
          <Button 
            type="primary" 
            icon={<LayoutGrid size={18}/>} 
            onClick={() => setShowTypeModal(true)}
            className="rounded-xl h-12 shadow-lg shadow-blue-100 font-semibold"
          >
            Manage Categories
          </Button>
        </div>

        <Row gutter={24}>
          {/* Left Column: Form */}
          <Col lg={8} xs={24}>
            <Card className="border-none shadow-sm rounded-[32px] sticky top-8">
              <div className="flex justify-between items-center mb-6">
                <Title level={4} style={{ margin: 0 }}>
                  {editingId ? 'Edit Expense' : 'New Expense'}
                </Title>
                {editingId && <Button type="text" danger icon={<X size={16}/>} onClick={() => { setEditingId(null); form.resetFields(); }} />}
              </div>

              <Form form={form} layout="vertical" onFinish={handleDailySubmit} initialValues={{ expense_date: moment() }}>
                <Form.Item name="expense_type_id" label="Category" rules={[{ required: true }]}>
                  <Select placeholder="Select type" className="h-11">
                    {expenseTypes.map(t => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
                  </Select>
                </Form.Item>

                <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
                  <InputNumber className="w-full h-11 flex items-center rounded-xl" prefix="₹" precision={2} />
                </Form.Item>

                <Form.Item name="expense_date" label="Date" rules={[{ required: true }]}>
                  <DatePicker className="w-full h-11 rounded-xl" />
                </Form.Item>

                <Form.Item name="description" label="Notes">
                  <Input.TextArea rows={3} placeholder="Provide details..." className="rounded-xl" />
                </Form.Item>

                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  size="large" 
                  loading={submitting}
                  icon={<Plus size={18} />}
                  className="h-14 rounded-2xl shadow-lg shadow-blue-100 font-bold"
                >
                  {editingId ? 'Update Expense' : 'Record Expense'}
                </Button>
              </Form>
            </Card>
          </Col>

          {/* Right Column: List */}
          <Col lg={16} xs={24}>
            {loading ? <ExpenseSkeleton /> : (
              <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                <div className="p-6 pb-0 flex justify-between items-center">
                  <Title level={4}>Expense History</Title>
                  <Button icon={<RefreshCw size={14}/>} onClick={fetchData} type="text">Sync</Button>
                </div>
                <Table 
                  dataSource={dailyExpenses} 
                  columns={columns} 
                  pagination={{ pageSize: 8 }} 
                  rowKey="id" 
                />
              </Card>
            )}
          </Col>
        </Row>

        {/* Categories Modal */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><LayoutGrid size={18}/> Manage Categories</div>}
          open={showTypeModal}
          onCancel={() => { setShowTypeModal(false); setEditingType(null); typeForm.resetFields(); }}
          footer={null}
          width={600}
          className="rounded-2xl"
        >
          <Form form={typeForm} layout="vertical" onFinish={handleTypeSubmit} className="mb-8">
            <Row gutter={12}>
              <Col span={14}>
                <Form.Item name="name" rules={[{ required: true }]} noStyle>
                  <Input placeholder="Category Name (e.g., Gas, Labour)" className="h-10 rounded-xl" />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Button type="primary" htmlType="submit" block className="h-10 rounded-xl font-bold">
                  {editingType ? 'Update' : 'Add Category'}
                </Button>
              </Col>
            </Row>
          </Form>
          
          <Divider className="my-0 mb-4" />
          
          <List
            dataSource={expenseTypes}
            className="max-h-64 overflow-y-auto pr-2 custom-scrollbar"
            renderItem={t => (
              <List.Item className="px-0">
                <div className="flex justify-between items-center w-full">
                  <Space direction="vertical" size={0}>
                    <Text strong>{t.name}</Text>
                    <Text className="text-[10px] text-slate-400">ID: {t.id}</Text>
                  </Space>
                  <Space>
                    <Button 
                      icon={<Edit3 size={14}/>} 
                      onClick={() => { setEditingType(t); typeForm.setFieldsValue(t); }} 
                      type="text" 
                    />
                    <Popconfirm title="Delete category?" onConfirm={() => messAPI.deleteExpenseType(t.id).then(fetchData)}>
                      <Button icon={<Trash2 size={14}/>} type="text" danger />
                    </Popconfirm>
                  </Space>
                </div>
              </List.Item>
            )}
          />
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default MessExpenses;