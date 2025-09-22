// src/components/mess/StoreManagement.jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Switch, Space, message, Popconfirm, Spin, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';

const StoreManagement = () => {
  const [form] = Form.useForm();
  const [stores, setStores] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [editingStore, setEditingStore] = useState(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const response = await messAPI.getStores();
      if (response.data.success) {
        setStores(response.data.data);
      } else {
        setError('Failed to load stores: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
      setError('Failed to load stores. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const showModal = (store = null) => {
    setEditingStore(store);
    form.resetFields();
    if (store) {
      form.setFieldsValue({
        name: store.name,
        address: store.address,
        contact_number: store.contact_number,
        is_active: store.is_active
      });
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingStore(null);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      let response;
      if (editingStore) {
        response = await messAPI.updateStore(editingStore.id, values);
      } else {
        response = await messAPI.createStore(values);
      }
      
      if (response.data.success) {
        message.success(`Store ${editingStore ? 'updated' : 'created'} successfully`);
        setIsModalVisible(false);
        fetchStores();
      } else {
        setError(`Failed to ${editingStore ? 'update' : 'create'} store: ` + 
          (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error(`Failed to ${editingStore ? 'update' : 'create'} store:`, error);
      setError(`Failed to ${editingStore ? 'update' : 'create'} store. Please try again later.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStore = async (id) => {
    try {
      const response = await messAPI.deleteStore(id);
      if (response.data.success) {
        message.success('Store deleted successfully');
        fetchStores();
      } else {
        message.error('Failed to delete store: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete store:', error);
      message.error('Failed to delete store. Please try again later.');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true
    },
    {
      title: 'Contact',
      dataIndex: 'contact_number',
      key: 'contact'
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (isActive) => (
        <span style={{ color: isActive ? 'green' : 'red' }}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => showModal(record)}
          />
          <Popconfirm
            title="Are you sure you want to delete this store?"
            onConfirm={() => handleDeleteStore(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="danger"
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card title="Store Management" bordered={false}>
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
      
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => showModal()}
        style={{ marginBottom: 16 }}
      >
        Add Store
      </Button>
      
      <Spin spinning={loading}>
        <Table
          dataSource={stores}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          bordered
        />
      </Spin>
      
      <Modal
        title={editingStore ? 'Edit Store' : 'Add Store'}
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
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
            <Input />
          </Form.Item>
          
          <Form.Item
            name="address"
            label="Address"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          
          <Form.Item
            name="contact_number"
            label="Contact Number"
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<SaveOutlined />}
              style={{ marginRight: 8 }}
            >
              {editingStore ? 'Update' : 'Create'}
            </Button>
            <Button htmlType="button" onClick={handleCancel}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default StoreManagement;
