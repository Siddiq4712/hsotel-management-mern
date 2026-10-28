import { PermissionButton as Button, PermissionPopconfirm as Popconfirm } from '../common/PermissionControls';
import React, { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { messAPI } from '../../services/api';
import AdditionalFoodStudentReport from './AdditionalFoodStudentReport';

const { Title, Text } = Typography;
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SpecialFoodItemsManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availabilityUpdating, setAvailabilityUpdating] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const load = async () => {
    setLoading(true);
    try { setItems((await messAPI.getSpecialFoodItems()).data.data || []); }
    catch { message.error('Unable to load additional food.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const edit = (item = null) => {
    setEditing(item);
    form.resetFields();
    form.setFieldsValue(item ? { ...item, max_quantity_per_student: item.max_quantity_per_student ?? 1, category: ['Veg', 'Non-Veg'].includes(item.category) ? item.category : undefined, price: Number(item.price), order_deadline_time: item.order_deadline_time || '19:00' } : { is_available: true, order_deadline_time: '19:00', max_quantity_per_student: 1 });
    setOpen(true);
  };
  const save = async values => {
    setSaving(true);
    try {
      if (editing) await messAPI.updateSpecialFoodItem(editing.id, { ...values, is_available: editing.is_available });
      else await messAPI.createSpecialFoodItem(values);
      message.success('Additional food saved.');
      setOpen(false);
      await load();
    } catch (error) { message.error(error.response?.data?.message || 'Unable to save additional food.'); }
    finally { setSaving(false); }
  };
  const remove = async id => {
    try { const result = await messAPI.deleteSpecialFoodItem(id); message.success(result.data.message); await load(); }
    catch (error) { message.error(error.response?.data?.message || 'Unable to remove food.'); }
  };
  const changeAvailability = async item => {
    setAvailabilityUpdating(item.id);
    try {
      const result = await messAPI.updateSpecialFoodAvailability(item.id, !item.is_available);
      setItems(current => current.map(food => food.id === item.id ? result.data.data : food));
      message.success(result.data.message);
    } catch (error) { message.error(error.response?.data?.message || 'Unable to update availability.'); }
    finally { setAvailabilityUpdating(null); }
  };
  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Price', dataIndex: 'price', render: value => `₹${Number(value).toFixed(2)}` },
    { title: 'Category', dataIndex: 'category', render: value => ['Veg', 'Non-Veg'].includes(value) ? value : <Tag>Set category</Tag> },
    { title: 'Meal', dataIndex: 'meal_type', render: value => value || <Tag>Set meal</Tag> },
    { title: 'Max per student', dataIndex: 'max_quantity_per_student', render: value => value ?? 1 },
    { title: 'Schedule', dataIndex: 'weekly_day', render: day => day == null ? <Tag>Choose a weekly day</Tag> : `Every ${days[day]}` },
    { title: 'Order deadline (IST)', dataIndex: 'order_deadline_time', render: time => <span>{time || '19:00'} on serving day</span> },
    { title: 'Availability', key: 'availability', render: (_, item) => <Button permissionAction="edit"
      type={item.is_available ? 'primary' : 'default'}
      style={{ width: 160, height: 32, flexShrink: 0 }}
      aria-label={`Mark ${item.name} as ${item.is_available ? 'not available' : 'available'}`}
      title={`Click to mark as ${item.is_available ? 'not available' : 'available'}`}
      loading={availabilityUpdating === item.id}
      disabled={availabilityUpdating !== null && availabilityUpdating !== item.id}
      onClick={() => changeAvailability(item)}
    >{item.is_available ? 'Available' : 'Not Available'}</Button> },
    { title: 'Actions', key: 'actions', render: (_, item) => <Space>
      <Button permissionAction="edit" aria-label={`Edit ${item.name}`} disabled={availabilityUpdating === item.id} icon={<Edit3 size={14} />} onClick={() => edit(item)} />
      <Popconfirm permissionAction="delete" title="Remove this additional food?" onConfirm={() => remove(item.id)}><Button danger aria-label={`Remove ${item.name}`} icon={<Trash2 size={14} />} /></Popconfirm>
    </Space> },
  ];
  return <div className="module-page p-8 bg-slate-50 min-h-screen">
    <div className="module-page-header flex justify-between items-center mb-8">
      <div><Title level={2}>Additional Food</Title><Text type="secondary">Create food available on a recurring weekly day.</Text></div>
      <Space wrap><AdditionalFoodStudentReport /><Button permissionAction="create" type="primary" icon={<Plus size={18} />} onClick={() => edit()}>Create Additional Food</Button></Space>
    </div>
    <Card><Table rowKey="id" dataSource={items} columns={columns} loading={loading} scroll={{ x: 650 }} /></Card>
    <Modal title={editing ? 'Edit Additional Food' : 'Create Additional Food'} open={open} onCancel={() => !saving && setOpen(false)} footer={null} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} initialValues={{ is_available: true }}>
        <Form.Item label="Name" name="name" rules={[{ required: true, whitespace: true, message: 'Enter a food name.' }]}><Input maxLength={255} /></Form.Item>
        <Form.Item label="Price (₹)" name="price" rules={[{ required: true, message: 'Enter a price.' }]}><InputNumber min={0} max={99999999.99} precision={2} className="w-full" /></Form.Item>
        <Form.Item label="Maximum quantity per student" name="max_quantity_per_student" extra="Total allowed for this food on one serving date, across all student orders." rules={[{ required: true, type: 'integer', min: 1, max: 1000, message: 'Enter a whole maximum quantity from 1 to 1000.' }]}><InputNumber min={1} max={1000} precision={0} className="w-full" /></Form.Item>
        <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Select Veg or Non-Veg.' }]}><Select options={['Veg', 'Non-Veg'].map(value => ({ value, label: value }))} /></Form.Item>
        <Form.Item label="Meal" name="meal_type" rules={[{ required: true, message: 'Select Breakfast, Lunch, or Dinner.' }]}><Select options={['Breakfast', 'Lunch', 'Dinner'].map(value => ({ value, label: value }))} /></Form.Item>
        <Form.Item label="Repeat" htmlFor="additional-food-repeat"><Input id="additional-food-repeat" value="Weekly" readOnly /></Form.Item>
        <Form.Item label="Day" name="weekly_day" rules={[{ required: true, message: 'Select a weekly day.' }]}><Select placeholder="Select day" options={days.map((label, value) => ({ label, value }))} /></Form.Item>
        <Form.Item label="Order deadline (IST)" name="order_deadline_time" extra="Students must confirm before this time on the serving day. Latest allowed: 7:00 PM." rules={[{ required: true, message: 'Select an ordering deadline.' }, { validator: (_, value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') && value <= '19:00' ? Promise.resolve() : Promise.reject(new Error('The deadline cannot be later than 7:00 PM.')) }]}><Input type="time" max="19:00" step={60} /></Form.Item>
        <Space><Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button><Button permissionAction={editing ? 'edit' : 'create'} type="primary" htmlType="submit" loading={saving}>Save Additional Food</Button></Space>
      </Form>
    </Modal>
  </div>;
}
