import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Input, Select, Form, Modal, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Option } = Select;

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mess/suppliers');
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      message.error('Failed to load suppliers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    form.setFieldsValue({
      name: supplier.name,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      supplier_type: supplier.supplier_type,
      is_active: supplier.is_active
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this supplier?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      onOk: async () => {
        try {
          await api.delete(`/mess/suppliers/${id}`);
          message.success('Supplier deleted successfully');
          fetchSuppliers();
        } catch (error) {
          console.error('Failed to delete supplier:', error);
          if (error.response && error.response.data && error.response.data.message) {
            message.error(error.response.data.message);
          } else {
            message.error('Failed to delete supplier. Please try again.');
          }
        }
      }
    });
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingSupplier) {
        await api.put(`/mess/suppliers/${editingSupplier.id}`, values);
        message.success('Supplier updated successfully');
      } else {
        await api.post('/mess/suppliers', values);
        message.success('Supplier added successfully');
      }
      setModalVisible(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to save supplier:', error);
      message.error('Failed to save supplier. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesType = typeFilter === 'all' || supplier.supplier_type === typeFilter;
    const matchesSearch = supplier.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchText.toLowerCase())) ||
                         (supplier.phone && supplier.phone.includes(searchText));
    return matchesType && matchesSearch;
  });

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Contact Person',
      dataIndex: 'contact_person',
      key: 'contact_person',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Type',
      dataIndex: 'supplier_type',
      key: 'supplier_type',
      render: (type) => (
        <Tag color={
          type === 'groceries' ? 'blue' :
          type === 'vegetables' ? 'green' :
          type === 'dairy' ? 'purple' :
          type === 'meat' ? 'red' : 'default'
        }>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Tag>
      ),
      filters: [
        { text: 'Groceries', value: 'groceries' },
        { text: 'Vegetables', value: 'vegetables' },
        { text: 'Dairy', value: 'dairy' },
        { text: 'Meat', value: 'meat' },
        { text: 'Other', value: 'other' },
      ],
      onFilter: (value, record) => record.supplier_type === value,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
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
            onClick={() => handleEdit(record)}
          />
          <Button 
            type="danger" 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card 
        title="Supplier Management" 
        bordered={false}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Add Supplier
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search suppliers..."
            prefix={<SearchOutlined />}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="Filter by type"
            style={{ width: 150 }}
            onChange={value => setTypeFilter(value)}
            defaultValue="all"
          >
            <Option value="all">All Types</Option>
            <Option value="groceries">Groceries</Option>
            <Option value="vegetables">Vegetables</Option>
            <Option value="dairy">Dairy</Option>
            <Option value="meat">Meat</Option>
            <Option value="other">Other</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredSuppliers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true, supplier_type: 'other' }}
        >
          <Form.Item
            name="name"
            label="Supplier Name"
            rules={[{ required: true, message: 'Please enter supplier name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="contact_person"
            label="Contact Person"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Please enter a valid email' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="supplier_type"
            label="Supplier Type"
            rules={[{ required: true, message: 'Please select supplier type' }]}
          >
            <Select>
              <Option value="groceries">Groceries</Option>
              <Option value="vegetables">Vegetables</Option>
              <Option value="dairy">Dairy</Option>
              <Option value="meat">Meat</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Status"
            valuePropName="checked"
          >
            <Select>
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              style={{ marginRight: 8 }}
            >
              {editingSupplier ? "Update" : "Add"}
            </Button>
            <Button htmlType="button" onClick={() => setModalVisible(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SupplierManagement;
