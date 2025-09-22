import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Select, Input, DatePicker, message, Table, InputNumber, Space, Divider, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { Printer } from "lucide-react";
import api from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const PurchaseOrderForm = () => {
  const [form] = Form.useForm();
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    fetchItems();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/mess/suppliers?is_active=true');
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      message.error('Failed to load suppliers. Please try again.');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/mess/items');
      setItems(response.data.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      message.error('Failed to load items. Please try again.');
    }
  };

  const handleAddItem = () => {
    const newItem = {
      key: Date.now(),
      item_id: undefined,
      quantity: 1,
      unit_price: 0
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const handleRemoveItem = (key) => {
    setSelectedItems(selectedItems.filter(item => item.key !== key));
  };

  const handleItemChange = (key, field, value) => {
    const updatedItems = selectedItems.map(item => {
      if (item.key === key) {
        if (field === 'item_id' && value) {
          const selectedItem = items.find(i => i.id === value);
          return { 
            ...item, 
            [field]: value, 
            unit_price: selectedItem.unit_price || 0 
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    setSelectedItems(updatedItems);
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
  };

  const handleSubmit = async (values) => {
    if (selectedItems.length === 0) {
      message.error('Please add at least one item to the purchase order');
      return;
    }

    if (selectedItems.some(item => !item.item_id)) {
      message.error('Please select items for all rows');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        supplier_id: values.supplier_id,
        expected_delivery: values.expected_delivery ? values.expected_delivery.format('YYYY-MM-DD') : null,
        items: selectedItems.map(item => ({
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      await api.post('/mess/purchase-orders', data);
      message.success('Purchase order created successfully');
      form.resetFields();
      setSelectedItems([]);
    } catch (error) {
      console.error('Failed to create purchase order:', error);
      message.error('Failed to create purchase order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Item',
      dataIndex: 'item_id',
      key: 'item_id',
      render: (item_id, record) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select item"
          value={item_id}
          onChange={(value) => handleItemChange(record.key, 'item_id', value)}
          showSearch
          optionFilterProp="children"
        >
          {items.map(item => (
            <Option key={item.id} value={item.id}>
              {item.name} ({item.UOM?.abbreviation || 'units'})
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity, record) => (
        <InputNumber
          min={0.01}
          step={0.01}
          value={quantity}
          onChange={(value) => handleItemChange(record.key, 'quantity', value)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (unit_price, record) => (
        <InputNumber
          min={0}
          step={0.01}
          value={unit_price}
          onChange={(value) => handleItemChange(record.key, 'unit_price', value)}
          style={{ width: '100%' }}
          formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value.replace(/₹\s?|(,*)/g, '')}
        />
      ),
    },
    {
      title: 'Total',
      key: 'total',
      render: (_, record) => (
        <span>₹ {(record.quantity * record.unit_price).toFixed(2)}</span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="danger"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.key)}
          size="small"
        />
      ),
    },
  ];

  return (
    <Card title="Create Purchase Order" bordered={false}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="supplier_id"
          label="Supplier"
          rules={[{ required: true, message: 'Please select a supplier' }]}
        >
          <Select
            placeholder="Select supplier"
            loading={loading}
            showSearch
            optionFilterProp="children"
          >
            {suppliers.map(supplier => (
              <Option key={supplier.id} value={supplier.id}>
                {supplier.name} ({supplier.supplier_type})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="expected_delivery"
          label="Expected Delivery Date"
        >
          <DatePicker style={{ width: '100%' }} disabledDate={(current) => current && current < moment().startOf('day')} />
        </Form.Item>

        <Divider orientation="left">Order Items</Divider>

        <Button
          type="dashed"
          onClick={handleAddItem}
          style={{ marginBottom: 16, width: '100%' }}
          icon={<PlusOutlined />}
        >
          Add Item
        </Button>

        <Table
          columns={columns}
          dataSource={selectedItems}
          pagination={false}
          rowKey="key"
          locale={{ emptyText: 'No items added' }}
        />

        <Divider />

        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <Title level={4}>Total Amount: ₹ {calculateTotal().toFixed(2)}</Title>
        </div>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<SaveOutlined />}
              disabled={selectedItems.length === 0}
            >
              Create Order
            </Button>            
            <Button
              icon={<Printer />}
              disabled={selectedItems.length === 0}
              onClick={() => window.print()}
            >
              Print Preview
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default PurchaseOrderForm;
