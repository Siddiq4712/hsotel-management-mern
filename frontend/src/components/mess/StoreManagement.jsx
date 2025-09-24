import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, message, Modal, Form, Input,
  Popconfirm, Typography, Tooltip, Switch
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined,
  EnvironmentOutlined, PhoneOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';

const { Text, Title } = Typography;

const StoreManagement = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchStores();
  }, [showInactive]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const params = {};
      if (!showInactive) {
        params.is_active = 'true';
      }
      
      const response = await messAPI.getStores(params);
      setStores(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingStore(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (store) => {
    setEditingStore(store);
    form.setFieldsValue({
      name: store.name,
      address: store.address,
      contact_number: store.contact_number,
      is_active: store.is_active
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.deleteStore(id);
      message.success('Store deleted successfully');
      fetchStores();
    } catch (error) {
      if (error.response?.status === 400) {
        message.error('This store cannot be deleted because it is being used by items');
      } else {
        message.error('Failed to delete store');
      }
    }
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      if (editingStore) {
        await messAPI.updateStore(editingStore.id, values);
        message.success('Store updated successfully');
      } else {
        await messAPI.createStore(values);
        message.success('Store created successfully');
      }
      setModalVisible(false);
      fetchStores();
    } catch (error) {
      message.error('Failed to save store');
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      title: 'Store Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => (
        <Space>
          <ShopOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (text) => (
        text ? (
          <Space>
            <EnvironmentOutlined />
            <span>{text}</span>
          </Space>
        ) : 'N/A'
      )
    },
    {
      title: 'Contact',
      dataIndex: 'contact_number',
      key: 'contact',
      render: (text) => (
        text ? (
          <Space>
            <PhoneOutlined />
            <span>{text}</span>
          </Space>
        ) : 'N/A'
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false }
      ],
      onFilter: (value, record) => record.is_active === value
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Popconfirm
            title="Are you sure you want to delete this store?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
          <Button 
            size="small" 
            onClick={() => {
              // Navigate to item-store mapping with this store pre-selected
              window.location.href = `/mess/item-store-mapping?store=${record.id}`;
            }}
          >
            Map Items
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Card 
      title="Store Management"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Store
        </Button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Switch
            checked={showInactive}
            onChange={(checked) => setShowInactive(checked)}
            checkedChildren="Show All"
            unCheckedChildren="Active Only"
          />
          
          <Button onClick={fetchStores} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={stores}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingStore ? 'Edit Store' : 'Add Store'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        confirmLoading={confirmLoading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label="Store Name"
            rules={[{ required: true, message: 'Please enter store name' }]}
          >
            <Input placeholder="Enter store name" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
          >
            <Input.TextArea rows={3} placeholder="Enter store address (optional)" />
          </Form.Item>

          <Form.Item
            name="contact_number"
            label="Contact Number"
          >
            <Input placeholder="Enter contact number (optional)" />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={confirmLoading}>
                {editingStore ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default StoreManagement;
