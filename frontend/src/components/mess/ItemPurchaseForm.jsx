// src/components/mess/ItemPurchaseForm.jsx
import React, { useState, useEffect } from 'react';
import { Form, Button, DatePicker, Select, Table, InputNumber, Input, message, Spin, Alert, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;

const ItemPurchaseForm = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchItems();
    fetchStores();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await messAPI.getItems();
      if (response.data.success) {
        setItems(response.data.data);
      } else {
        message.error('Failed to load items: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
      message.error('Failed to load items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await messAPI.getStores();
      if (response.data.success) {
        setStores(response.data.data);
      } else {
        message.error('Failed to load stores: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      message.error('Failed to load stores. Please try again later.');
    }
  };

  const addItemRow = () => {
    setSelectedItems([...selectedItems, {
      key: Date.now(),
      item_id: null,
      store_id: null,
      quantity: 0,
      unit: '',
      unit_price: 0,
      notes: ''
    }]);
  };

  const removeItemRow = (key) => {
    setSelectedItems(selectedItems.filter(item => item.key !== key));
  };

  const handleItemChange = (key, field, value) => {
    setSelectedItems(prevItems => {
      return prevItems.map(item => {
        if (item.key === key) {
          if (field === 'item_id') {
            // Find the selected item to get its unit
            const selectedItem = items.find(i => i.id === value);
            return { 
              ...item, 
              [field]: value, 
              unit: selectedItem?.UOM?.abbreviation || 'units' 
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      });
    });
  };

  const handleSubmit = async (values) => {
    if (selectedItems.length === 0 || selectedItems.some(item => !item.item_id || !item.quantity)) {
      message.warning('Please add at least one item with quantity.');
      return;
    }

    // Prepare data for API
    const purchaseItems = selectedItems.map(item => ({
      item_id: item.item_id,
      store_id: item.store_id,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      transaction_date: values.transaction_date.format('YYYY-MM-DD'),
      notes: item.notes
    }));

    setSubmitting(true);
    setError(null);
    try {
      const response = await messAPI.recordInventoryPurchase({ items: purchaseItems });
      
      if (response.data.success) {
        message.success('Inventory purchases recorded successfully');
        // Reset form
        form.resetFields();
        setSelectedItems([]);
      } else {
        setError('Failed to record purchases: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to record purchases:', error);
      setError('Failed to record purchases. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Item',
      dataIndex: 'item_id',
      key: 'item_id',
      render: (value, record) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select Item"
          value={value}
          onChange={(val) => handleItemChange(record.key, 'item_id', val)}
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {items.map(item => (
            <Option key={item.id} value={item.id}>
              {item.name} ({item.tbl_ItemCategory?.name})
            </Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Store',
      dataIndex: 'store_id',
      key: 'store_id',
      render: (value, record) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select Store (Optional)"
          value={value}
          onChange={(val) => handleItemChange(record.key, 'store_id', val)}
          allowClear
          showSearch
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {stores.map(store => (
            <Option key={store.id} value={store.id}>{store.name}</Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (value, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          value={value}
          onChange={(val) => handleItemChange(record.key, 'quantity', val)}
        />
      )
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      render: (value) => value || 'units'
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (value, record) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          step={0.01}
          value={value}
          onChange={(val) => handleItemChange(record.key, 'unit_price', val)}
          formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value.replace(/₹\s?|(,*)/g, '')}
        />
      )
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (value, record) => (
        <Input
          value={value}
          onChange={(e) => handleItemChange(record.key, 'notes', e.target.value)}
          placeholder="Optional notes"
        />
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Are you sure you want to remove this item?"
          onConfirm={() => removeItemRow(record.key)}
          okText="Yes"
          cancelText="No"
        >
          <Button 
            type="danger" 
            icon={<DeleteOutlined />} 
            size="small"
          />
        </Popconfirm>
      )
    }
  ];

  return (
    <div>
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
        initialValues={{ transaction_date: moment() }}
      >
        <Form.Item
          name="transaction_date"
          label="Purchase Date"
          rules={[{ required: true, message: 'Please select a date' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <Button 
            type="dashed" 
            onClick={addItemRow} 
            style={{ width: '100%' }}
            icon={<PlusOutlined />}
          >
            Add Item
          </Button>
        </div>

        <Spin spinning={loading}>
          <Table
            dataSource={selectedItems}
            columns={columns}
            rowKey="key"
            pagination={false}
            bordered
            size="middle"
            locale={{ emptyText: 'Click "Add Item" to start adding items for purchase' }}
            summary={pageData => {
              const totalItems = pageData.length;
              const totalAmount = pageData.reduce(
                (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
                0
              );
              
              return (
                <>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <strong>Total</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <strong>{totalItems} items</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} colSpan={2}>
                      <strong>₹ {totalAmount.toFixed(2)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} colSpan={2}></Table.Summary.Cell>
                  </Table.Summary.Row>
                </>
              );
            }}
          />
        </Spin>

        <Form.Item style={{ marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<SaveOutlined />}
            disabled={loading || selectedItems.length === 0}
          >
            Record Purchases
          </Button>
          <Button
            htmlType="button"
            onClick={() => { form.resetFields(); setSelectedItems([]); }}
            style={{ marginLeft: 8 }}
            icon={<ReloadOutlined />}
            disabled={loading || submitting}
          >
            Reset
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default ItemPurchaseForm;
