import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Form, Button, Select, InputNumber, message, DatePicker, 
  Row, Col, Space, Typography, Divider, Tag, Input, 
  ConfigProvider, theme, Skeleton 
} from 'antd';
import { 
  Plus, Trash2, Save, Utensils, User, Calendar, 
  ClipboardList, CreditCard, ChevronRight, Info 
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;

// --- Specialized Skeleton for Form ---
const FormSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-8 bg-white overflow-hidden">
    <div className="space-y-8">
      <Row gutter={24}>
        <Col span={12}><Skeleton.Input active block style={{ height: 45 }} /></Col>
        <Col span={12}><Skeleton.Input active block style={{ height: 45 }} /></Col>
      </Row>
      <Skeleton active paragraph={{ rows: 2 }} />
      <Divider />
      {[...Array(2)].map((_, i) => (
        <Row key={i} gutter={16} align="middle">
          <Col span={10}><Skeleton.Input active block /></Col>
          <Col span={4}><Skeleton.Input active block /></Col>
          <Col span={8}><Skeleton.Input active block /></Col>
        </Row>
      ))}
    </div>
  </Card>
);

const RecordStudentSpecialMeal = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [specialFoodItems, setSpecialFoodItems] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [studentsRes, foodRes] = await Promise.all([
        messAPI.getStudents(),
        messAPI.getSpecialFoodItems()
      ]);
      setStudents(studentsRes.data.data || []);
      setSpecialFoodItems(foodRes.data.data || []);
    } catch (error) {
      message.error('Failed to load required data');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const updateItemDetails = (foodItemId, index) => {
    const itemDetails = specialFoodItems.find(item => item.id === foodItemId);
    const currentFoodItems = form.getFieldValue('foodItems');

    if (itemDetails) {
      const quantity = currentFoodItems[index]?.quantity || 1;
      const unitPrice = parseFloat(itemDetails.price);
      const subtotal = (quantity * unitPrice);

      currentFoodItems[index] = {
        ...currentFoodItems[index],
        unit_price: unitPrice,
        subtotal: subtotal,
        item_name: itemDetails.name
      };
      form.setFieldsValue({ foodItems: currentFoodItems });
    }
  };

  const handleSubmit = async (values) => {
    const itemsToSubmit = values.foodItems
      .filter(item => item.food_item_id && item.quantity > 0)
      .map(item => ({
        food_item_id: item.food_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

    if (itemsToSubmit.length === 0) {
      return message.warning('Please add at least one valid food item.');
    }

    setSubmitting(true);
    try {
      await messAPI.recordStaffRecordedSpecialFoodConsumption({
        student_id: values.student_id,
        consumption_date: values.consumption_date.format('YYYY-MM-DD'),
        items: itemsToSubmit,
        description: values.description
      });

      message.success('Special meal recorded and billed successfully!');
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to record meal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FormSkeleton />;

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="max-w-5xl mx-auto">
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          initialValues={{ consumption_date: moment(), foodItems: [{ quantity: 1 }] }}
        >
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                <Utensils className="text-white" size={24} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0 }}>Special Meal Entry</Title>
                <Text type="secondary">Record non-menu food items and automate billing</Text>
              </div>
            </div>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting} 
              icon={<Save size={18} />}
              className="rounded-xl h-12 px-8 shadow-lg shadow-blue-100 font-bold"
            >
              Confirm & Save
            </Button>
          </div>

          <Row gutter={24}>
            {/* Primary Details */}
            <Col lg={10} xs={24}>
              <Card className="border-none shadow-sm rounded-[32px] p-2 sticky top-8">
                <Title level={4} className="mb-6 flex items-center gap-2">
                  <ClipboardList size={20} className="text-blue-600" /> Basic Information
                </Title>
                
                <Form.Item name="student_id" label="Student Beneficiary" rules={[{ required: true }]}>
                  <Select
                    placeholder="Search Student..."
                    showSearch
                    optionFilterProp="children"
                    className="h-11"
                    suffixIcon={<User size={16} />}
                  >
                    {students.map(s => <Option key={s.id} value={s.id}>{s.username}</Option>)}
                  </Select>
                </Form.Item>

                <Form.Item name="consumption_date" label="Date of Consumption" rules={[{ required: true }]}>
                  <DatePicker className="w-full h-11 rounded-xl" suffixIcon={<Calendar size={16} />} />
                </Form.Item>

                <Form.Item name="description" label="Notes / Reason">
                  <Input.TextArea rows={3} placeholder="e.g., Birthday Celebration, Late Request" className="rounded-xl" />
                </Form.Item>

                <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info size={18} className="text-blue-500 shrink-0 mt-1" />
                    <Text className="text-[11px] text-blue-700">
                        Total amounts calculated here will be automatically debited from the student's mess account upon submission.
                    </Text>
                </div>
              </Card>
            </Col>

            {/* Itemized List */}
            <Col lg={14} xs={24}>
              <div className="space-y-6">
                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden">
                  <Title level={4} className="p-6 pb-0 mb-4 flex items-center gap-2">
                    <CreditCard size={20} className="text-blue-600" /> Itemized Billing
                  </Title>
                  
                  <Form.List name="foodItems">
                    {(fields, { add, remove }) => (
                      <div className="px-6 pb-6">
                        {fields.map(({ key, name, ...restField }, index) => (
                          <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 group relative">
                            <Row gutter={16} align="middle">
                              <Col span={12}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'food_item_id']}
                                  label={<span className="text-[10px] uppercase font-bold text-slate-400">Select Dish</span>}
                                  rules={[{ required: true }]}
                                >
                                  <Select
                                    placeholder="Choose Item"
                                    showSearch
                                    onChange={(val) => updateItemDetails(val, index)}
                                    className="h-10"
                                  >
                                    {specialFoodItems.map(item => (
                                      <Option key={item.id} value={item.id}>
                                        {item.name} <Text type="secondary" className="text-xs">(₹{parseFloat(item.price).toFixed(2)})</Text>
                                      </Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col span={5}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'quantity']}
                                  label={<span className="text-[10px] uppercase font-bold text-slate-400">Qty</span>}
                                  rules={[{ required: true }]}
                                >
                                  <InputNumber 
                                    min={1} 
                                    className="w-full h-10 flex items-center rounded-xl" 
                                    onChange={() => updateItemDetails(form.getFieldValue(['foodItems', name, 'food_item_id']), index)}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={7}>
                                <div className="pt-6">
                                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex justify-between items-center">
                                    <Text className="text-[10px] text-slate-400 font-bold uppercase">Subtotal</Text>
                                    <Text strong className="text-blue-600">
                                      ₹{parseFloat(form.getFieldValue(['foodItems', name, 'subtotal']) || 0).toFixed(2)}
                                    </Text>
                                  </div>
                                </div>
                              </Col>
                            </Row>
                            {fields.length > 1 && (
                              <Button 
                                type="text" 
                                danger 
                                icon={<Trash2 size={16} />} 
                                onClick={() => remove(name)}
                                className="absolute -top-2 -right-2 bg-white shadow-sm border border-rose-100 rounded-full h-8 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            )}
                          </div>
                        ))}
                        
                        <Button 
                          type="dashed" 
                          onClick={() => add({ quantity: 1 })} 
                          block 
                          icon={<Plus size={16} />}
                          className="h-12 rounded-xl border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-600 transition-all"
                        >
                          Add Another Dish
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Card>
              </div>
            </Col>
          </Row>
        </Form>
      </div>
    </ConfigProvider>
  );
};

export default RecordStudentSpecialMeal;