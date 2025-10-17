import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Card, Table, InputNumber, message, Row, Col, DatePicker, Spin, Tooltip, Space, Select } from 'antd';
import { SaveOutlined, InfoCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;

const RecordAdhocConsumption = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [consumptionQuantities, setConsumptionQuantities] = useState({});

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [itemsResponse, categoriesResponse] = await Promise.all([
          messAPI.getItems(),
          messAPI.getItemCategories()
        ]);
        console.log('Fetched items response:', itemsResponse.data);
        const availableItems = itemsResponse.data.data.map(item => ({
          ...item,
          key: item.id,
        }));
        setItems(availableItems);
        setCategories(categoriesResponse.data.data || []);
      } catch (error) {
        console.error('Data fetch error:', error.response || error);
        message.error('Failed to fetch data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Memoized filtered and searched items
  const filteredItems = useMemo(() => {
    let filtered = [...items];
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category_id === parseInt(selectedCategory));
    }
    if (searchText) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.tbl_ItemCategory?.name || '').toLowerCase().includes(searchText.toLowerCase())
      );
    }
    return filtered;
  }, [items, selectedCategory, searchText]);

  // Update pagination total when filtered data changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, total: filteredItems.length, current: 1 }));
  }, [filteredItems]);

  // Paginated data
  const paginatedItems = useMemo(() => {
    const { current, pageSize } = pagination;
    const start = (current - 1) * pageSize;
    const end = start + pageSize;
    return filteredItems.slice(start, end);
  }, [filteredItems, pagination]);

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
          console.warn(`Item not found for ID: ${itemId}`);
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

    console.log('Submitting payload to /mess/special-consumption:', JSON.stringify(payload, null, 2));

    try {
      const response = await messAPI.recordAdhocConsumption(payload);
      console.log('Create special consumption response:', response.data);
      message.success('Ad-hoc consumption recorded successfully!');
      
      const lowStock = response.data.data?.lowStockItems || [];
      if (lowStock.length > 0) {
        console.log('Low stock items:', lowStock);
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
      });
      message.error(error.response?.data?.message || 'Failed to record consumption.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle pagination change
  const handlePaginationChange = (page, pageSize) => {
    setPagination({ ...pagination, current: page, pageSize });
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
      align: 'right',
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
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="Filter by category"
            style={{ width: 200 }}
            value={selectedCategory}
            onChange={setSelectedCategory}
            allowClear
          >
            <Option value="all">All Categories</Option>
            {categories.map(category => (
              <Option key={category.id} value={category.id}>
                {category.name}
              </Option>
            ))}
          </Select>
          <Input
            placeholder="Search items..."
            allowClear
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={paginatedItems}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            onChange: handlePaginationChange,
            onShowSizeChange: (page, pageSize) => handlePaginationChange(1, pageSize),
          }}
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