import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Input, Select, Form, Modal, message, Tabs, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Option } = Select;
const { TabPane } = Tabs;

const GroceryManagement = () => {
  const [groceryForm] = Form.useForm();
  const [typeForm] = Form.useForm();
  
  const [groceries, setGroceries] = useState([]);
  const [groceryTypes, setGroceryTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [editingGrocery, setEditingGrocery] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [units, setUnits] = useState([]);

  useEffect(() => {
    fetchGroceries();
    fetchGroceryTypes();
    fetchUnits();
  }, []);

  const fetchGroceries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mess/groceries');
      setGroceries(response.data.data);
    } catch (error) {
      console.error('Failed to fetch groceries:', error);
      message.error('Failed to load groceries');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroceryTypes = async () => {
    try {
      const response = await api.get('/mess/grocery-types');
      setGroceryTypes(response.data.data);
    } catch (error) {
      console.error('Failed to fetch grocery types:', error);
      message.error('Failed to load grocery types');
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await api.get('/mess/uoms');
      setUnits(response.data.data);
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  const handleAddGrocery = () => {
    setEditingGrocery(null);
    groceryForm.resetFields();
    setModalVisible(true);
  };

  const handleEditGrocery = (grocery) => {
    setEditingGrocery(grocery);
    groceryForm.setFieldsValue({
      name: grocery.name,
      grocery_type_id: grocery.grocery_type_id,
      unit: grocery.unit,
      unit_id: grocery.unit_id,
      current_stock: grocery.current_stock,
      minimum_stock: grocery.minimum_stock,
      unit_price: grocery.unit_price
    });
    setModalVisible(true);
  };

  const handleDeleteGrocery = async (id) => {
    try {
      await api.delete(`/mess/groceries/${id}`);
      message.success('Grocery deleted successfully');
      fetchGroceries();
    } catch (error) {
      console.error('Failed to delete grocery:', error);
      message.error('Failed to delete grocery');
    }
  };

  const handleSubmitGrocery = async (values) => {
    setSubmitting(true);
    try {
      if (editingGrocery) {
        await api.put(`/mess/groceries/${editingGrocery.id}`, values);
        message.success('Grocery updated successfully');
      } else {
        await api.post('/mess/groceries', values);
        message.success('Grocery added successfully');
      }
      setModalVisible(false);
      fetchGroceries();
    } catch (error) {
      console.error('Failed to save grocery:', error);
      message.error('Failed to save grocery');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddType = () => {
    setEditingType(null);
    typeForm.resetFields();
    setTypeModalVisible(true);
  };

  const handleEditType = (type) => {
    setEditingType(type);
    typeForm.setFieldsValue({
      name: type.name,
      description: type.description
    });
    setTypeModalVisible(true);
  };

  const handleDeleteType = async (id) => {
    try {
      await api.delete(`/mess/grocery-types/${id}`);
      message.success('Grocery type deleted successfully');
      fetchGroceryTypes();
    } catch (error) {
      console.error('Failed to delete grocery type:', error);
      message.error('Failed to delete grocery type');
    }
  };

  const handleSubmitType = async (values) => {
    setSubmitting(true);
    try {
      if (editingType) {
        await api.put(`/mess/grocery-types/${editingType.id}`, values);
        message.success('Grocery type updated successfully');
      } else {
        await api.post('/mess/grocery-types', values);
        message.success('Grocery type added successfully');
      }
      setTypeModalVisible(false);
      fetchGroceryTypes();
    } catch (error) {
      console.error('Failed to save grocery type:', error);
      message.error('Failed to save grocery type');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGroceries = groceries.filter(grocery => {
    const matchesType = typeFilter === 'all' || grocery.grocery_type_id.toString() === typeFilter;
    const matchesSearch = grocery.name.toLowerCase().includes(searchText.toLowerCase());
    return matchesType && matchesSearch;
  });

  const groceryColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Type',
      dataIndex: ['type', 'name'],
      key: 'type',
      render: text => text || 'N/A',
      filters: groceryTypes.map(type => ({ text: type.name, value: type.name })),
      onFilter: (value, record) => record.type?.name === value,
    },
    {
      title: 'Current Stock',
      dataIndex: 'current_stock',
      key: 'current_stock',
      render: (text, record) => `${text} ${record.unit}`,
      sorter: (a, b) => a.current_stock - b.current_stock,
    },
    {
      title: 'Min. Stock',
      dataIndex: 'minimum_stock',
      key: 'minimum_stock',
      render: (text, record) => `${text} ${record.unit}`,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: text => text ? `₹${parseFloat(text).toFixed(2)}` : '₹0.00',
      sorter: (a, b) => a.unit_price - b.unit_price,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const isBelowMinimum = parseFloat(record.current_stock) <= parseFloat(record.minimum_stock);
        return (
          <Tag color={isBelowMinimum ? 'red' : 'green'}>
            {isBelowMinimum ? 'Low Stock' : 'In Stock'}
          </Tag>
        );
      },
      filters: [
        { text: 'Low Stock', value: 'low' },
        { text: 'In Stock', value: 'in' },
      ],
      onFilter: (value, record) => {
        const isBelowMinimum = parseFloat(record.current_stock) <= parseFloat(record.minimum_stock);
        return (value === 'low' && isBelowMinimum) || (value === 'in' && !isBelowMinimum);
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEditGrocery(record)}
          />
          <Button 
            type="danger" 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={() => {
              Modal.confirm({
                title: 'Delete Grocery',
                content: `Are you sure you want to delete ${record.name}?`,
                onOk: () => handleDeleteGrocery(record.id)
              });
            }}
          />
        </Space>
      ),
    },
  ];

  const typeColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEditType(record)}
          />
          <Button 
            type="danger" 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={() => {
              Modal.confirm({
                title: 'Delete Grocery Type',
                content: `Are you sure you want to delete ${record.name}?`,
                onOk: () => handleDeleteType(record.id)
              });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <Card title="Grocery Management" bordered={false}>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Groceries" key="1">
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddGrocery}
              >
                Add Grocery
              </Button>
              <Input
                placeholder="Search groceries"
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 200 }}
                prefix={<SearchOutlined />}
                allowClear
              />
              <Select
                placeholder="Filter by type"
                style={{ width: 180 }}
                onChange={value => setTypeFilter(value)}
                value={typeFilter}
              >
                <Option value="all">All Types</Option>
                {groceryTypes.map(type => (
                  <Option key={type.id} value={type.id.toString()}>{type.name}</Option>
                ))}
              </Select>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => {
                  fetchGroceries();
                  setSearchText('');
                  setTypeFilter('all');
                }}
              >
                Reset
              </Button>
            </Space>
          </div>

          <Table
            columns={groceryColumns}
            dataSource={filteredGroceries}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
        <TabPane tab="Grocery Types" key="2">
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddType}
            >
              Add Grocery Type
            </Button>
          </div>

          <Table
            columns={typeColumns}
            dataSource={groceryTypes}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>

      {/* Grocery Form Modal */}
      <Modal
        title={editingGrocery ? "Edit Grocery" : "Add Grocery"}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={groceryForm}
          layout="vertical"
          onFinish={handleSubmitGrocery}
        >
          <Form.Item
            name="name"
            label="Grocery Name"
            rules={[{ required: true, message: 'Please enter grocery name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="grocery_type_id"
            label="Grocery Type"
            rules={[{ required: true, message: 'Please select grocery type' }]}
          >
            <Select placeholder="Select grocery type">
              {groceryTypes.map(type => (
                <Option key={type.id} value={type.id}>{type.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="unit_id"
            label="Unit of Measurement"
            rules={[{ required: true, message: 'Please select unit' }]}
          >
            <Select placeholder="Select unit" onChange={(value) => {
              const selectedUnit = units.find(u => u.id === value);
              if (selectedUnit) {
                groceryForm.setFieldsValue({ unit: selectedUnit.abbreviation });
              }
            }}>
              {units.map(unit => (
                <Option key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="unit"
            label="Unit Abbreviation"
            hidden
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="current_stock"
            label="Current Stock"
            rules={[{ required: true, message: 'Please enter current stock' }]}
          >
            <Input type="number" min="0" step="0.01" />
          </Form.Item>
          <Form.Item
            name="minimum_stock"
            label="Minimum Stock"
            rules={[{ required: true, message: 'Please enter minimum stock' }]}
          >
            <Input type="number" min="0" step="0.01" />
          </Form.Item>
          <Form.Item
            name="unit_price"
            label="Unit Price (₹)"
            rules={[{ required: true, message: 'Please enter unit price' }]}
          >
            <Input type="number" min="0" step="0.01" prefix="₹" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={submitting}
              >
                {editingGrocery ? "Update" : "Add"}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Grocery Type Form Modal */}
      <Modal
        title={editingType ? "Edit Grocery Type" : "Add Grocery Type"}
        visible={typeModalVisible}
        onCancel={() => setTypeModalVisible(false)}
        footer={null}
      >
        <Form
          form={typeForm}
          layout="vertical"
          onFinish={handleSubmitType}
        >
          <Form.Item
            name="name"
            label="Type Name"
            rules={[{ required: true, message: 'Please enter type name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={submitting}
              >
                {editingType ? "Update" : "Add"}
              </Button>
              <Button onClick={() => setTypeModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default GroceryManagement;
