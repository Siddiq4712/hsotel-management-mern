import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Select, InputNumber, message, DatePicker, Row, Col, Space, Typography, Divider, Tag } from 'antd';
import { PlusOutlined, MinusCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title } = Typography;

const DailyConsumptionForm = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]); // New: Students state
  const [mealTypes] = useState(['breakfast', 'lunch', 'dinner', 'snacks']);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredItems, setFilteredItems] = useState([]);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchStudents(); // New: Fetch students
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const filtered = items.filter(item => item.category_id === selectedCategory);
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [selectedCategory, items]);

  const fetchItems = async () => {
    try {
      const response = await messAPI.getItems();
      setItems(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch items');
    }
  };

  const fetchStudents = async () => { // New: Fetch students
    try {
      // Assuming messAPI has getStudents; adjust if using a different API like userAPI
      const response = await messAPI.getStudents(); // Or replace with appropriate API call
      setStudents(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch students');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await messAPI.getItemCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch categories');
    }
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const consumption_date = values.consumption_date.format('YYYY-MM-DD');
      const meal_type = values.meal_type;
      const student_id = values.student_id; // New: Include student_id
      
      const consumptionsToSubmit = values.consumptions.map(consumption => ({
        item_id: consumption.item_id,
        quantity_consumed: consumption.quantity,
        unit: consumption.unit || getUnitForItem(consumption.item_id),
        consumption_date,
        meal_type,
        student_id // New: Add student_id to each consumption if needed; adjust based on API
      }));

      await messAPI.recordBulkConsumption({ 
        student_id, // New: Pass student_id at top level if API expects it
        consumptions: consumptionsToSubmit 
      });
      message.success('Consumption recorded successfully');
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error('Failed to record consumption: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getUnitForItem = (itemId) => {
    const item = items.find(i => i.id === itemId);
    return item?.unit || item?.UOM?.abbreviation || 'unit';
  };

  const handleItemSelect = (value, index) => {
    const item = items.find(i => i.id === value);
    if (item) {
      // Set the unit for this item in the form
      const consumptions = form.getFieldValue('consumptions');
      consumptions[index].unit = item.UOM?.abbreviation || 'unit';
      form.setFieldsValue({ consumptions });
    }
  };

  // New: Filter students for search by roll_number or name
  const handleStudentSearch = (input, option) => {
    const student = students.find(s => s.id === option.key);
    if (!student) return false;
    const searchValue = input.toLowerCase();
    return (
      student.roll_number.toLowerCase().includes(searchValue) ||
      student.username.toLowerCase().includes(searchValue) ||
      student.username.toLowerCase().includes(searchValue) // Optional: include username if available
    );
  };

  // New: Display format for student option
  const studentOptionRender = (option) => {
    const student = students.find(s => s.id === option.key);
    if (!student) return option.label;
    return `${student.roll_number} - ${student.username}`;
  };

  return (
    <Card>
      <Title level={4}>Record Daily Consumption</Title>
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        initialValues={{
          consumption_date: moment(),
          meal_type: 'lunch',
          student_id: undefined, // New: Initial student
          consumptions: [{}]
        }}
      >
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="student_id" // New: Student selection field
              label="Student"
              rules={[{ required: true, message: 'Please select student' }]}
            >
              <Select
                showSearch
                placeholder="Search student by roll number or name"
                optionFilterProp="label" // Use custom filter
                filterOption={handleStudentSearch}
                optionRender={studentOptionRender}
                style={{ width: '100%' }}
              >
                {students.map(student => (
                  <Option key={student.id} value={student.id}>
                    {`${student.roll_number} - ${student.username}`} // Fallback for display
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="consumption_date"
              label="Consumption Date"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="meal_type"
              label="Meal Type"
              rules={[{ required: true, message: 'Please select meal type' }]}
            >
              <Select>
                {mealTypes.map(type => (
                  <Option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Items Consumed</Divider>
        
        <Row style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Select
              placeholder="Filter by category"
              allowClear
              style={{ width: 200 }}
              onChange={handleCategoryChange}
            >
              {categories.map(category => (
                <Option key={category.id} value={category.id}>{category.name}</Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Form.List name="consumptions">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Row key={key} gutter={16} align="middle" style={{ marginBottom: 8 }}>
                  <Col xs={24} sm={10}>
                    <Form.Item
                      {...restField}
                      name={[name, 'item_id']}
                      rules={[{ required: true, message: 'Select item' }]}
                    >
                      <Select
                        placeholder="Select item"
                        showSearch
                        optionFilterProp="children"
                        onChange={(value) => handleItemSelect(value, index)}
                      >
                        {filteredItems.map(item => (
                          <Option key={item.id} value={item.id}>
                            {item.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={16} sm={8}>
                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      rules={[{ required: true, message: 'Enter quantity' }]}
                    >
                      <InputNumber 
                        placeholder="Quantity" 
                        style={{ width: '100%' }} 
                        min={0.01} 
                        step={0.1} 
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={8} sm={4}>
                    <Form.Item
                      {...restField}
                      name={[name, 'unit']}
                    >
                      <Tag color="blue">Unit</Tag>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={2} style={{ textAlign: 'right' }}>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                  </Col>
                </Row>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Item
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
            Record Consumption
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default DailyConsumptionForm;