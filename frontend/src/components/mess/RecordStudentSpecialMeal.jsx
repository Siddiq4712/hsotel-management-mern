import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Select, InputNumber, message, DatePicker, Row, Col, Space, Typography, Divider, Tag, Input } from 'antd';
import { PlusOutlined, MinusCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;

const RecordStudentSpecialMeal = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [specialFoodItems, setSpecialFoodItems] = useState([]);
  
  useEffect(() => {
    fetchStudents();
    fetchSpecialFoodItems();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await messAPI.getStudents(); 
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      message.error('Failed to fetch students');
    }
  };

  const fetchSpecialFoodItems = async () => {
    try {
      const response = await messAPI.getSpecialFoodItems(); 
      setSpecialFoodItems(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch special food items:', error);
      message.error('Failed to fetch special food items');
    }
  };

  const getSpecialFoodItemDetails = (foodItemId) => {
    return specialFoodItems.find(item => item.id === foodItemId);
  };

  const updateItemDetails = (foodItemId, index) => {
    const itemDetails = getSpecialFoodItemDetails(foodItemId);
    const currentFoodItems = form.getFieldValue('foodItems');

    if (itemDetails) {
      const quantity = currentFoodItems[index]?.quantity || 1;
      // FIX: Ensure itemDetails.price is parsed as a float
      const unitPrice = parseFloat(itemDetails.price); 
      const subtotal = (quantity * unitPrice).toFixed(2);

      currentFoodItems[index] = {
        ...currentFoodItems[index],
        unit_price: unitPrice,
        subtotal: parseFloat(subtotal),
        item_name: itemDetails.name
      };
      form.setFieldsValue({ foodItems: currentFoodItems });
    }
  };

  const handleItemSelect = (value, index) => {
    updateItemDetails(value, index);
  };

  const handleQuantityChange = (value, index) => {
    const currentFoodItems = form.getFieldValue('foodItems');
    const foodItemId = currentFoodItems[index]?.food_item_id;
    if (foodItemId) {
      updateItemDetails(foodItemId, index);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const consumption_date = values.consumption_date.format('YYYY-MM-DD');
      const student_id = values.student_id;
      
      const itemsToSubmit = values.foodItems
        .filter(item => item.food_item_id && item.quantity > 0)
        .map(item => ({
          food_item_id: item.food_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

      if (itemsToSubmit.length === 0) {
        message.error('Please add at least one food item with a positive quantity.');
        setLoading(false);
        return;
      }

      await messAPI.recordStaffRecordedSpecialFoodConsumption({
        student_id,
        consumption_date,
        items: itemsToSubmit,
        description: values.description
      });

      message.success('Special meal recorded and charges added to student fees successfully!');
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error recording special meal:', error);
      message.error('Failed to record special meal: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Title level={4}>Record Student Special Meal</Title>
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        initialValues={{
          consumption_date: moment(),
          foodItems: [{ quantity: 1 }]
        }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="consumption_date"
              label="Consumption Date"
              rules={[{ required: true, message: 'Please select a date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="student_id"
              label="Student"
              rules={[{ required: true, message: 'Please select a student' }]}
            >
              <Select
                placeholder="Select Student"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {students.map(student => (
                  <Option key={student.id} value={student.id}>
                    {student.username}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Notes/Description">
          <Input.TextArea rows={2} placeholder="Optional notes for this special meal, e.g., 'Late order'" />
        </Form.Item>

        <Divider orientation="left">Special Food Items Consumed</Divider>
        
        <Form.List name="foodItems">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => {
                const unitPrice = form.getFieldValue(['foodItems', name, 'unit_price']);
                const subtotal = form.getFieldValue(['foodItems', name, 'subtotal']);

                return (
                  <Row key={key} gutter={16} align="middle" style={{ marginBottom: 8 }}>
                    <Col xs={24} sm={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'food_item_id']}
                        rules={[{ required: true, message: 'Select food item' }]}
                      >
                        <Select
                          placeholder="Select Food Item"
                          showSearch
                          optionFilterProp="children"
                          onChange={(value) => handleItemSelect(value, index)}
                        >
                          {specialFoodItems.map(item => (
                            <Option key={item.id} value={item.id}>
                              {item.name} (₹{parseFloat(item.price).toFixed(2)}) {/* FIX APPLIED HERE */}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Enter quantity' }]}
                        initialValue={1}
                      >
                        <InputNumber 
                          placeholder="Qty" 
                          style={{ width: '100%' }} 
                          min={1} 
                          step={1} 
                          onChange={(value) => handleQuantityChange(value, index)}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={4}>
                      <Form.Item label="Unit Price">
                        <Text strong>₹{unitPrice !== undefined ? unitPrice.toFixed(2) : '0.00'}</Text>
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Form.Item label="Subtotal">
                        <Text strong type="success">₹{subtotal !== undefined ? subtotal.toFixed(2) : '0.00'}</Text>
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={2} style={{ textAlign: 'right' }}>
                      <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                    </Col>
                  </Row>
                );
              })}
              <Form.Item>
                <Button type="dashed" onClick={() => add({ quantity: 1 })} block icon={<PlusOutlined />}>
                  Add Food Item
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading} 
            icon={<SaveOutlined />}
          >
            Record Special Meal
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default RecordStudentSpecialMeal;
