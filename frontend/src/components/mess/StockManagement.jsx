import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, message, Space, Typography, Tag, Switch, Modal, Form, InputNumber, DatePicker, Select as AntSelect } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext'; // Assuming you have an AuthContext for user data

const { Title, Text } = Typography;
const { Option } = AntSelect;

const StockManagement = () => {
  const [stocks, setStocks] = useState([]);
  const [items, setItems] = useState([]); // For item selection in modal
  const [loading, setLoading] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuth(); // Get user data including hostel_id

  useEffect(() => {
    fetchStocks();
    fetchItems();
  }, [showLowStock]);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const response = await messAPI.getItemStock({ low_stock: showLowStock });
      const formattedStocks = (response.data.data || []).map(stock => ({
        ...stock,
        key: `${stock.item_id}-${stock.hostel_id}`,
        item_name: stock.Item?.name,
        category_name: stock.Item?.tbl_ItemCategory?.name || 'N/A',
        unit: stock.Item?.UOM?.abbreviation || 'unit',
      }));
      setStocks(formattedStocks);
    } catch (error) {
      message.error('Failed to fetch stock: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await messAPI.getItems();
      setItems(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch items: ' + (error.response?.data?.message || error.message));
    }
  };

  const showAddStockModal = () => {
    setIsModalVisible(true);
  };

  const handleAddStock = async (values) => {
    try {
      const payload = {
        item_id: values.item_id,
        hostel_id: user.hostel_id, // Use hostel_id from user context
        quantity: values.quantity,
        unit_price: values.unit_price,
        purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : undefined,
      };

      await messAPI.updateItemStock(payload);
      message.success('Stock added successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchStocks(); // Refresh stock table
    } catch (error) {
      message.error('Failed to add stock: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary">{record.category_name}</Text>
        </Space>
      ),
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Current Stock',
      dataIndex: 'current_stock',
      key: 'current_stock',
      render: (stock, record) => (
        <Space>
          <Text>{`${stock} ${record.unit}`}</Text>
          {stock <= record.minimum_stock && stock > 0 && <Tag color="warning">Low Stock</Tag>}
          {stock === 0 && <Tag color="error">Out of Stock</Tag>}
        </Space>
      ),
    },
    {
      title: 'Minimum Stock',
      dataIndex: 'minimum_stock',
      key: 'minimum_stock',
      render: (stock, record) => `${stock} ${record.unit}`,
    },
  ];

  return (
    <Card
      title={<Title level={3}>Stock Management</Title>}
      extra={
        <Space>
          <Switch
            checkedChildren="Low Stock Only"
            unCheckedChildren="All Stock"
            checked={showLowStock}
            onChange={setShowLowStock}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchStocks}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddStockModal}>
            Add Stock
          </Button>
        </Space>
      }
    >
      <Table
        dataSource={stocks}
        columns={columns}
        rowKey="key"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      <Modal
        title="Add Stock"
        visible={isModalVisible}
        onOk={form.submit}
        onCancel={handleCancel}
        okText="Add Stock"
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddStock}
          initialValues={{
            quantity: 0,
            unit_price: 0,
          }}
        >
          <Form.Item
            name="item_id"
            label="Item"
            rules={[{ required: true, message: 'Please select an item' }]}
          >
            <Select placeholder="Select an item">
              {items.map(item => (
                <Option key={item.id} value={item.id}>
                  {item.name} ({item.UOM?.abbreviation || 'unit'})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[
              { required: true, message: 'Please enter quantity' },
              { type: 'number', min: 0.01, message: 'Quantity must be greater than 0' },
            ]}
          >
            <InputNumber min={0.01} step={0.1} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="unit_price"
            label="Unit Price"
            rules={[
              { required: true, message: 'Please enter unit price' },
              { type: 'number', min: 0, message: 'Unit price cannot be negative' },
            ]}
          >
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="purchase_date"
            label="Purchase Date"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default StockManagement;