import React, { useState, useEffect } from 'react';
import { Card, Form, Button, InputNumber, DatePicker, Select, message, Table, Spin, Alert } from 'antd';
import { SaveOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { messAPI } from '../../services/api';
import moment from 'moment';
const { Option } = Select;

const DailyConsumptionForm = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  const fetchItems = async (categoryId = 'all') => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/mess/items?category_id=${categoryId}`);
      if (response.data.success) {
        // Items already come with stock_quantity from the updated backend
        const withConsumption = response.data.data.map(item => ({
          ...item,
          consumed_quantity: 0
        }));
        setItems(withConsumption);
      } else {
        setError('Failed to fetch items: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setError('Failed to load items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/mess/item-categories');
      if (response.data.success) {
        setCategories(response.data.data);
      } else {
        message.error('Failed to load categories: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      message.error('Failed to load categories. Please try again later.');
    }
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    fetchItems(value);
  };

  const handleQuantityChange = (value, recordId) => {
    setItems(prev =>
      prev.map(item =>
        item.id === recordId ? { ...item, consumed_quantity: value } : item
      )
    );
  };

  const handleSubmit = async (values) => {
    const consumptions = items
      .filter(item => item.consumed_quantity > 0) // take only filled ones
      .map(item => ({
        item_id: item.id,
        quantity_consumed: item.consumed_quantity,
        unit: item.UOM?.abbreviation || 'units',
        consumption_date: values.date.format('YYYY-MM-DD')
      }));

    if (consumptions.length === 0) {
      message.warning('Please enter at least one consumption.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await messAPI.recordBulkConsumption({ consumptions });
      
      if (response.data.success) {
        if (response.data.data.stock_updates) {
          // Update the local state with new stock quantities
          const stockUpdates = response.data.data.stock_updates;
          setItems(prevItems => 
            prevItems.map(item => {
              const update = stockUpdates.find(u => u.item_id === item.id);
              if (update) {
                return { 
                  ...item, 
                  stock_quantity: update.stock_quantity, 
                  consumed_quantity: 0 
                };
              }
              return { ...item, consumed_quantity: 0 };
            })
          );
        } else {
          // Reset consumption quantities if no stock updates
          setItems(prevItems => 
            prevItems.map(item => ({ ...item, consumed_quantity: 0 }))
          );
        }
        
        message.success('Daily consumption recorded successfully');
        form.resetFields();
        form.setFieldsValue({ date: moment() });
      } else {
        setError('Failed to record consumption: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to record consumption:', error);
      setError('Failed to record consumption. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    form.setFieldsValue({ date: moment() });
    setItems(prevItems => prevItems.map(item => ({ ...item, consumed_quantity: 0 })));
  };

  const columns = [
    {
      title: 'Item',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <span>
          {text}
          {record.stock_quantity <= 0 && (
            <ExclamationCircleOutlined 
              style={{ color: 'red', marginLeft: 8 }} 
              title="Out of stock" 
            />
          )}
        </span>
      )
    },
    {
      title: 'Category',
      dataIndex: ['tbl_ItemCategory', 'name'],
      key: 'category',
    },
    {
      title: 'Available Stock',
      dataIndex: 'stock_quantity',
      key: 'stock_quantity',
      render: (val) => (
        <span style={{ color: val <= 0 ? 'red' : val < 10 ? 'orange' : 'inherit' }}>
          {val ?? 0}
        </span>
      )
    },
    {
      title: 'Unit',
      dataIndex: ['UOM', 'abbreviation'],
      key: 'unit',
      render: (val) => val || 'units'
    },
    {
      title: 'Total Consumed Quantity',
      key: 'consumed_quantity',
      render: (_, record) => (
        <InputNumber
          min={0}
          max={record.stock_quantity || 999999}
          step={0.01}
          value={record.consumed_quantity}
          onChange={(val) => handleQuantityChange(val, record.id)}
          disabled={record.stock_quantity <= 0}
          style={{ width: '100%' }}
        />
      )
    }
  ];

  return (
    <Card title="Record Daily Consumption" bordered={false}>
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => setError(null)}
        />
      )}
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ date: moment() }}
      >
        <Form.Item name="category" label="Category">
  <Select
    placeholder="Select category"
    onChange={handleCategoryChange}
    loading={loading}
    defaultValue="all"
    style={{ width: '100%' }}
  >
    <Option value="all">All Categories</Option>
    {categories.map(c => (
      <Option key={c.id} value={c.id}>{c.name}</Option>
    ))}
  </Select>
</Form.Item>


        <Form.Item
          name="date"
          label="Consumption Date"
          rules={[{ required: true, message: 'Please select a date' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <Spin spinning={loading}>
            <Table
              dataSource={items}
              columns={columns}
              rowKey="id"
              pagination={false}
              bordered
              size="middle"
              scroll={{ y: 400 }}
              summary={pageData => {
                const totalConsumed = pageData.reduce(
                  (total, item) => total + (item.consumed_quantity || 0),
                  0
                );
                
                return (
                  <>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4}>
                        <strong>Total Items Consumed</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <strong>{totalConsumed.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </>
                );
              }}
            />
          </Spin>
        </div>

        <Form.Item style={{ marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
            disabled={loading}
          >
            Record Daily Consumption
          </Button>
          <Button
            htmlType="button"
            onClick={handleReset}
            style={{ marginLeft: 8 }}
            icon={<ReloadOutlined />}
            disabled={loading || submitting}
          >
            Reset
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default DailyConsumptionForm;
