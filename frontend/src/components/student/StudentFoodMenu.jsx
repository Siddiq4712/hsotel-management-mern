import { PermissionButton as Button } from '../common/PermissionControls';
import React, { useCallback, useEffect, useState } from 'react';
import { Card, Col, Descriptions, Empty, Form, Input, InputNumber, Modal, Row, Segmented, Select, Space, Spin, Table, Tag, Typography, message } from 'antd';
import { DatePicker } from '../common/MomentPickers';
import { studentAPI } from '../../services/api';
import moment from 'moment';
import { additionalFoodClosed, additionalFoodDeadline } from '../../utils/additionalFood';

const { Title, Text } = Typography;
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const today = () => moment().utcOffset(330).startOf('day');
export const nextServingDate = (day, current = today()) => {
  const date = current.clone().startOf('day');
  return day == null ? date : date.add((Number(day) - date.day() + 7) % 7, 'days');
};

export default function StudentFoodMenu() {
  const [tab, setTab] = useState('Menu');
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState('all');
  const [meal, setMeal] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [form] = Form.useForm();
  const quantity = Form.useWatch('quantity', form) || 1;
  const servingDate = Form.useWatch('serving_date', form);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const selectionClosed = selected && servingDate && additionalFoodClosed(selected, servingDate.format('YYYY-MM-DD'), now);
  const loadMenu = useCallback(async () => {
    setLoading(true);
    try { setItems((await studentAPI.getSpecialFoodItems()).data.data || []); }
    catch { message.error('Unable to load additional food.'); }
    finally { setLoading(false); }
  }, []);
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try { setOrders((await studentAPI.getFoodOrders()).data.data || []); }
    catch { message.error('Unable to load food orders.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (tab === 'Menu') loadMenu(); else loadOrders(); }, [tab, loadMenu, loadOrders]);
  const add = item => {
    setSelected(item);
    form.setFieldsValue({ quantity: 1, serving_date: nextServingDate(item.weekly_day) });
  };
  const confirm = async values => {
    if (saving || !selected) return;
    if (additionalFoodClosed(selected, values.serving_date.format('YYYY-MM-DD'))) return message.error('The ordering deadline has passed for this serving date.');
    setSaving(true);
    try {
      await studentAPI.createFoodOrder({
        items: [{ food_item_id: selected.id, quantity: values.quantity }],
        serving_date: values.serving_date.format('YYYY-MM-DD'),
      });
      message.success('Additional food request confirmed.');
      setSelected(null);
      form.resetFields();
      setTab('Orders');
    } catch (error) { message.error(error.response?.data?.message || 'Unable to confirm additional food.'); }
    finally { setSaving(false); }
  };
  const filtered = items.filter(item => (category === 'all' || item.category === category) && (meal === 'all' || item.meal_type === meal) && item.name.toLowerCase().includes(search.toLowerCase()));
  const columns = [
    { title: 'Order', dataIndex: 'id', render: id => `#${id}` },
    { title: 'Food', key: 'food', render: (_, order) => order.FoodOrderItems?.map(item => `${item.SpecialFoodItem?.name || 'Food'} × ${item.quantity}`).join(', ') },
    { title: 'Serving date', dataIndex: 'requested_time', render: value => moment(value).utcOffset(330).format('DD MMM YYYY') },
    { title: 'Total', dataIndex: 'total_amount', render: value => `₹${Number(value).toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', render: value => <Tag>{value}</Tag> },
    { title: 'Action', key: 'action', render: (_, order) => <Button onClick={() => setDetails(order)}>View</Button> },
  ];
  return <div className="module-page p-4 md:p-8 bg-slate-50 min-h-screen">
    <div className="module-page-header flex justify-between items-center mb-8 flex-wrap gap-4">
      <div><Title level={2}>Additional Food</Title><Text type="secondary">Choose food from the weekly schedule, add it, and confirm a serving date.</Text></div>
      <Segmented options={['Menu', 'Orders']} value={tab} onChange={setTab} />
    </div>
    {tab === 'Menu' ? <>
      <Card className="mb-6"><Space wrap>
        <Input aria-label="Search food" placeholder="Search food..." value={search} onChange={event => setSearch(event.target.value)} />
        <Select aria-label="Filter category" value={category} onChange={setCategory} style={{ minWidth: 160 }} options={['all', 'Veg', 'Non-Veg'].map(value => ({ value, label: value === 'all' ? 'All categories' : value }))} />
        <Select aria-label="Filter meal" value={meal} onChange={setMeal} style={{ minWidth: 160 }} options={['all', 'Breakfast', 'Lunch', 'Dinner'].map(value => ({ value, label: value === 'all' ? 'All meals' : value }))} />
      </Space></Card>
      <Spin spinning={loading}><Row gutter={[16, 16]}>
        {filtered.map(item => <Col xs={24} sm={12} lg={8} key={item.id}><Card>
          <Tag color={item.category === 'Veg' ? 'green' : item.category === 'Non-Veg' ? 'red' : 'default'}>{['Veg', 'Non-Veg'].includes(item.category) ? item.category : 'Category not set'}</Tag><Tag color="blue">{item.meal_type || 'Meal not set'}</Tag>
          <Title level={4}>{item.name}</Title>
          <p>{item.weekly_day == null ? 'Available food' : `Every ${days[item.weekly_day]}`}</p>
          <p>Maximum {item.max_quantity_per_student ?? 1} per student per serving date.</p>
          <p>Order before {additionalFoodDeadline(item, nextServingDate(item.weekly_day).format('YYYY-MM-DD')).format('h:mm A')} on the serving day (IST).</p>
          <div className="flex justify-between items-center"><Text strong>₹{Number(item.price).toFixed(2)}</Text><Button permissionAction="create" type="primary" disabled={additionalFoodClosed(item, nextServingDate(item.weekly_day).format('YYYY-MM-DD'), now)} onClick={() => add(item)}>{additionalFoodClosed(item, nextServingDate(item.weekly_day).format('YYYY-MM-DD'), now) ? 'Ordering closed' : 'Add'}</Button></div>
        </Card></Col>)}
      </Row>{!loading && !filtered.length && <Empty description="No additional food available" />}</Spin>
    </> : <Card title="My Additional Food Orders"><Table rowKey="id" columns={columns} dataSource={orders} loading={loading} scroll={{ x: 650 }} /></Card>}
    <Modal title="Confirm Additional Food" open={!!selected} onCancel={() => !saving && setSelected(null)} footer={null} destroyOnHidden>
      {selected && <>
        <Title level={4}>{selected.name}</Title>
        <p>{['Veg', 'Non-Veg'].includes(selected.category) ? selected.category : 'Category not set'} · {selected.meal_type || 'Meal not set'} · {selected.weekly_day == null ? 'Available food' : `Every ${days[selected.weekly_day]}`}</p>
        {servingDate && <p>Order before {additionalFoodDeadline(selected, servingDate.format('YYYY-MM-DD')).format('DD MMM YYYY, h:mm A')} (IST).{selectionClosed && ' Ordering is closed.'}</p>}
        <Form form={form} layout="vertical" onFinish={confirm}>
          <Form.Item label="Serving date" name="serving_date" rules={[{ required: true, message: 'Select a serving date.' }]}>
            <DatePicker format="DD MMM YYYY" disabledDate={date => date && (date.format('YYYY-MM-DD') < today().format('YYYY-MM-DD') || (selected.weekly_day != null && date.day() !== Number(selected.weekly_day)))} />
          </Form.Item>
          <Form.Item label="Quantity" name="quantity" extra={`Maximum ${selected.max_quantity_per_student ?? 1} in total for this food on this serving date.`} rules={[{ required: true, type: 'integer', min: 1, max: selected.max_quantity_per_student ?? 1, message: `Enter a whole quantity from 1 to ${selected.max_quantity_per_student ?? 1}.` }]}><InputNumber min={1} max={selected.max_quantity_per_student ?? 1} precision={0} /></Form.Item>
          <p><Text strong>Total: ₹{(Math.round(Number(selected.price) * 100) * quantity / 100).toFixed(2)}</Text></p>
          <p><Text type="secondary">This request is for the selected serving date only. The amount is added to your additional bill.</Text></p>
          <Space><Button onClick={() => setSelected(null)} disabled={saving}>Cancel</Button><Button permissionAction="create" type="primary" htmlType="submit" loading={saving} disabled={selectionClosed}>Confirm</Button></Space>
        </Form>
      </>}
    </Modal>
    <Modal title={`Additional Food Order #${details?.id}`} open={!!details} onCancel={() => setDetails(null)} footer={<Button onClick={() => setDetails(null)}>Close</Button>}>
      {details && <>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Status">{details.status}</Descriptions.Item>
          <Descriptions.Item label="Serving date">{moment(details.requested_time).utcOffset(330).format('DD MMM YYYY')}</Descriptions.Item>
          <Descriptions.Item label="Total">₹{Number(details.total_amount).toFixed(2)}</Descriptions.Item>
        </Descriptions>
        {details.FoodOrderItems?.map(item => <p key={item.id}>{item.SpecialFoodItem?.name} × {item.quantity} — ₹{Number(item.subtotal).toFixed(2)}</p>)}
      </>}
    </Modal>
  </div>;
}
