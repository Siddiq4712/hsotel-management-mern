import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Button, Tag, Space, Select, message, Modal, Form, InputNumber } from 'antd';
import { SearchOutlined, PlusOutlined, WarningOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Option } = Select;

const StockManagement = () => {
  const [form] = Form.useForm();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [visible, setVisible] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStock();
    fetchCategories();
    fetchItems();
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mess/stock');
      setStock(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stock:', error);
      message.error('Failed to load stock data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/mess/item-categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/mess/items');
      setItems(response.data.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const handleUpdateStock = (record) => {
    setEditingStock(record);
    form.setFieldsValue({
      item_id: record.item_id,
      current_stock: record.current_stock,
      minimum_stock: record.minimum_stock
    });
    setVisible(true);
  };

  const handleAddStock = () => {
    setEditingStock(null);
    form.resetFields();
    setVisible(true);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await api.post('/mess/stock', values);
      message.success('Stock updated successfully');
      setVisible(false);
      fetchStock();
    } catch (error) {
      console.error('Failed to update stock:', error);
      message.error('Failed to update stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewLowStock = () => {
    setLoading(true);
    api.get('/mess/stock?low_stock=true')
      .then(response => {
        setStock(response.data.data);
        message.info(`Found ${response.data.data.length} items with low stock`);
      })
      .catch(error => {
        console.error('Failed to fetch low stock:', error);
        message.error('Failed to fetch low stock data');
      })
      .finally(() => setLoading(false));
  };

  const getStockStatus = (current, minimum) => {
    const currentNum = parseFloat(current);
    const minimumNum = parseFloat(minimum);
    
    if (currentNum <= 0) return 'out_of_stock';
    if (currentNum <= minimumNum) return 'low_stock';
    return 'in_stock';
  };

  const filteredStock = stock.filter(item => {
    const matchesCategory = categoryFilter === 'all' || 
      item.Item.category_id.toString() === categoryFilter;
    
    const matchesSearch = item.Item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.Item.tbl_ItemCategory?.name || '').toLowerCase().includes(searchText.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const columns = [
    {
      title: 'Item',
      dataIndex: ['Item', 'name'],
      key: 'name',
      sorter: (a, b) => a.Item.name.localeCompare(b.Item.name),
    },
    {
      title: 'Category',
      dataIndex: ['Item', 'tbl_ItemCategory', 'name'],
      key: 'category',
      render: (text) => text || 'N/A',
      filters: categories.map(cat => ({ text: cat.name, value: cat.name })),
      onFilter: (value, record) => record.Item.tbl_ItemCategory?.name === value,
    },
    {
      title: 'Current Stock',
      dataIndex: 'current_stock',
      key: 'current_stock',
      render: (text, record) => (
        <span>
          {text} {record.Item.UOM?.abbreviation || 'units'}
        </span>
      ),
      sorter: (a, b) => parseFloat(a.current_stock) - parseFloat(b.current_stock),
    },
    {
      title: 'Min. Stock',
      dataIndex: 'minimum_stock',
      key: 'minimum_stock',
      render: (text, record) => (
        <span>
          {text} {record.Item.UOM?.abbreviation || 'units'}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const status = getStockStatus(record.current_stock, record.minimum_stock);
        
        let color = 'green';
        let text = 'In Stock';
        
        if (status === 'low_stock') {
          color = 'orange';
          text = 'Low Stock';
        } else if (status === 'out_of_stock') {
          color = 'red';
          text = 'Out of Stock';
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
      filters: [
        { text: 'In Stock', value: 'in_stock' },
        { text: 'Low Stock', value: 'low_stock' },
        { text: 'Out of Stock', value: 'out_of_stock' },
      ],
      onFilter: (value, record) => 
        getStockStatus(record.current_stock, record.minimum_stock) === value,
    },
    {
      title: 'Last Updated',
      dataIndex: 'last_updated',
      key: 'last_updated',
      render: text => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.last_updated) - new Date(b.last_updated),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="primary" 
          icon={<EditOutlined />}
          onClick={() => handleUpdateStock(record)}
          size="small"
        >
          Update
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card 
        title="Inventory Management" 
        bordered={false}
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddStock}
            >
              Add/Update Stock
            </Button>
            <Button 
              type="default" 
              icon={<ReloadOutlined />}
              onClick={fetchStock}
            >
              Refresh
            </Button>
            <Button 
              type="danger" 
              icon={<WarningOutlined />}
              onClick={handleViewLowStock}
            >
              Low Stock
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search items..."
            prefix={<SearchOutlined />}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="Filter by category"
            style={{ width: 200 }}
            onChange={value => setCategoryFilter(value)}
            defaultValue="all"
          >
            <Option value="all">All Categories</Option>
            {categories.map(category => (
              <Option key={category.id} value={category.id.toString()}>
                {category.name}
              </Option>
            ))}
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredStock}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingStock ? "Update Stock" : "Add/Update Stock"}
        visible={visible}
        onCancel={() => setVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="item_id"
            label="Item"
            rules={[{ required: true, message: 'Please select an item' }]}
          >
            <Select 
              placeholder="Select item"
              showSearch
              optionFilterProp="children"
              disabled={!!editingStock}
            >
              {items.map(item => (
                <Option key={item.id} value={item.id}>
                  {item.name} ({item.UOM?.abbreviation || 'units'})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="current_stock"
            label="Current Stock"
            rules={[{ required: true, message: 'Please enter current stock' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="minimum_stock"
            label="Minimum Stock"
            rules={[{ required: true, message: 'Please enter minimum stock' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              style={{ marginRight: 8 }}
            >
              {editingStock ? "Update" : "Add/Update"}
            </Button>
            <Button htmlType="button" onClick={() => setVisible(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default StockManagement;
