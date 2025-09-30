import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Table, InputNumber, message, Row, Col, DatePicker, Spin, Tooltip } from 'antd';
import { SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const RecordAdhocConsumption = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [consumptionQuantities, setConsumptionQuantities] = useState({});

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const response = await messAPI.getItems();
        console.log('Fetched items response:', response.data); // Log the items response
        const availableItems = response.data.data.map(item => ({
          ...item,
          key: item.id,
        }));
        setItems(availableItems);
      } catch (error) {
        console.error('Item fetch error:', error.response || error); // Log detailed error
        message.error('Failed to fetch inventory items.');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const handleQuantityChange = (itemId, value) => {
    setConsumptionQuantities(prev => ({
      ...prev,
      [itemId]: value > 0 ? value : undefined,
    }));
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    const itemsToConsume = Object.entries(consumptionQuantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => {
        const itemDetails = items.find(i => i.id === parseInt(itemId));
        if (!itemDetails) {
          console.warn(`Item not found for ID: ${itemId}`); // Log missing item
          return null;
        }
        return {
          item_id: parseInt(itemId),
          quantity_consumed: quantity,
          unit_id: itemDetails.unit_id,
        };
      }).filter(Boolean);

    if (itemsToConsume.length === 0) {
      console.log('No items to consume, aborting submission.');
      message.warning('Please enter a quantity for at least one item.');
      setSubmitting(false);
      return;
    }

    const payload = {
      name: values.name,
      description: values.description,
      consumption_date: values.consumption_date.format('YYYY-MM-DD'),
      items: itemsToConsume,
    };

    console.log('Submitting payload to /mess/special-consumption:', JSON.stringify(payload, null, 2)); // Log formatted payload

    try {
      const response = await messAPI.recordAdhocConsumption(payload);
      console.log('Create special consumption response:', response.data); // Log full response
      message.success('Ad-hoc consumption recorded successfully!');
      
      const lowStock = response.data.data?.lowStockItems || [];
      if (lowStock.length > 0) {
        console.log('Low stock items:', lowStock); // Log low stock items
        lowStock.forEach(item => {
          message.warning(`Low stock alert for ${item.name}: ${item.current_stock} ${item.unit} remaining.`);
        });
      }

      form.resetFields();
      setConsumptionQuantities({});
    } catch (error) {
      console.error('Submission error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
        request: {
          url: error.config?.url,
          data: error.config?.data,
          headers: error.config?.headers,
        },
      }); // Detailed error logging
      message.error(error.response?.data?.message || 'Failed to record consumption.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: ['tbl_ItemCategory', 'name'],
      key: 'category',
      sorter: (a, b) => a.tbl_ItemCategory.name.localeCompare(b.tbl_ItemCategory.name),
    },
    {
      title: 'Current Stock',
      dataIndex: 'stock_quantity',
      key: 'stock_quantity',
      sorter: (a, b) => a.stock_quantity - b.stock_quantity,
      render: (text, record) => (
        <span>
          {text || 0} {record.UOM?.abbreviation || 'units'}
          {record.stock_quantity <= record.minimum_stock && (
            <Tooltip title="Stock is at or below minimum level">
              <InfoCircleOutlined style={{ color: 'orange', marginLeft: 8 }} />
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: 'Quantity to Consume',
      key: 'action',
      width: '25%',
      render: (_, record) => (
        <InputNumber
          min={0}
          max={record.stock_quantity || 0}
          style={{ width: '100%' }}
          placeholder={`Enter quantity in ${record.UOM?.abbreviation || 'units'}`}
          value={consumptionQuantities[record.id]}
          onChange={(value) => handleQuantityChange(record.id, value)}
          disabled={submitting}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <Spin tip="Loading Inventory..." />
      </Card>
    );
  }

  return (
    <Card title="Record Ad-hoc Consumption">
      <p style={{ marginBottom: 16, color: '#888' }}>
        Use this form to record inventory consumption for special events like parties, donations, or any other purpose outside of the regular daily menu.
      </p>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ consumption_date: moment() }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="name"
              label="Consumption Event Name"
              rules={[{ required: true, message: 'Please enter a name for this event.' }]}
            >
              <Input placeholder="e.g., Orphanage Donation, Staff Party" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="consumption_date"
              label="Date of Consumption"
              rules={[{ required: true, message: 'Please select a date.' }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label="Description / Reason (Optional)">
          <Input.TextArea rows={2} placeholder="Add any relevant details or notes here." />
        </Form.Item>

        <h3 style={{ marginTop: 24, marginBottom: 16 }}>Consumed Items</h3>
        <Table
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          bordered
          size="small"
          loading={loading}
          rowClassName={(record) => record.stock_quantity <= 0 ? 'bg-gray-100 opacity-60' : ''}
        />

        <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
            size="large"
          >
            Save Consumption
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default RecordAdhocConsumption;