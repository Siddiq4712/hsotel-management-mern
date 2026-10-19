import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, message, Typography, Card, Space, ConfigProvider, theme, Select, Statistic, Row, Col } from 'antd';
import { RefreshCw, ChefHat } from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';
import { DatePicker } from '../common/MomentPickers';
import AdditionalFoodStudentReport from './AdditionalFoodStudentReport';
import { additionalFoodSummary, ACTIVE_FOOD_ORDER_STATUSES } from '../../utils/additionalFoodSummary';

const { Title, Text } = Typography;
const columns = [
  { title: 'Serving date', dataIndex: 'serving_date', render: value => moment(value).format('DD MMM YYYY') },
  { title: 'Category', dataIndex: 'category' },
  { title: 'Meal', dataIndex: 'meal_type' },
  { title: 'Food', dataIndex: 'food', render: value => <Text strong>{value}</Text> },
  { title: 'No. of students', dataIndex: 'student_count', align: 'right' },
  { title: 'Student orders (qty)', dataIndex: 'student_quantity', align: 'right' },
  { title: 'Mess extras (qty)', dataIndex: 'staff_quantity', align: 'right' },
  { title: 'Total quantity', dataIndex: 'quantity', align: 'right', render: value => <Text strong>{value}</Text> },
];

export default function MessOrderDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(null);
  const [meal, setMeal] = useState('all');
  const fetchOrders = useCallback(async (automatic = false) => {
    if (!automatic) setLoading(true);
    try {
      const response = await messAPI.getFoodOrders({ status: ACTIVE_FOOD_ORDER_STATUSES });
      setOrders(response.data.data || []);
    } catch (error) { message.error(error.response?.data?.message || 'Unable to load the food order summary.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);
  const summary = useMemo(() => additionalFoodSummary(orders, { date: date?.format('YYYY-MM-DD'), meal }), [orders, date, meal]);
  return <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
    <div className="module-page p-8 bg-slate-50 min-h-screen">
      <div className="module-page-header flex justify-between items-center mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100"><ChefHat className="text-white" size={24} /></div>
          <div><Title level={2} style={{ margin: 0 }}>Additional Food Order Summary</Title>
            <Text type="secondary">Student orders and extras recorded by mess staff, updated every 30 seconds.</Text></div>
        </div>
        <Space wrap><AdditionalFoodStudentReport /><Button icon={<RefreshCw size={16} />} onClick={() => fetchOrders()}>Refresh</Button></Space>
      </div>
      <Space wrap className="mb-6">
        <DatePicker aria-label="Summary serving date" value={date} onChange={setDate} placeholder="All serving dates" format="DD MMM YYYY" />
        <Select aria-label="Summary meal" value={meal} onChange={setMeal} style={{ minWidth: 160 }} options={['all', 'Breakfast', 'Lunch', 'Dinner'].map(value => ({ value, label: value === 'all' ? 'All meals' : value }))} />
      </Space>
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}><Card><Statistic title="Students" value={summary.student_count} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="Food entries" value={summary.rows.length} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="Total quantity" value={summary.quantity} /></Card></Col>
      </Row>
      <Card>
        <Text type="secondary">Each food's student count is unique: a student with both an order and a mess-recorded extra is counted once. Cancelled orders are excluded.</Text>
        <Table rowKey="key" dataSource={summary.rows} columns={columns} loading={loading} pagination={{ pageSize: 12 }} scroll={{ x: 1100 }} locale={{ emptyText: 'No additional food selections for these filters.' }} />
      </Card>
    </div>
  </ConfigProvider>;
}
