import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, message, Modal, Form, Input,
  Select, Popconfirm, Typography, Tag
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';

const { Option } = Select;
const { Title, Text } = Typography;

const UOMManagement = () => {
  const [uoms, setUOMs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUOM, setEditingUOM] = useState(null);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const uomTypes = ['weight', 'volume', 'length', 'count', 'other'];

  useEffect(() => {
    fetchUOMs();
  }, []);

  const fetchUOMs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedType !== 'all') {
        params.type = selectedType;
      }
      
      const response = await messAPI.getUOMs(params);
      setUOMs(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch UOMs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUOM(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (uom) => {
    setEditingUOM(uom);
    form.setFieldsValue({
      name: uom.name,
      abbreviation: uom.abbreviation,
      type: uom.type
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.deleteUOM(id);
      message.success('UOM deleted successfully');
      fetchUOMs();
    } catch (error) {
      if (error.response?.status === 400) {
        message.error('This UOM cannot be deleted because it is being used by items');
      } else {
        message.error('Failed to delete UOM');
      }
    }
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      if (editingUOM) {
        await messAPI.updateUOM(editingUOM.id, values);
        message.success('UOM updated successfully');
      } else {
        await messAPI.createUOM(values);
        message.success('UOM created successfully');
      }
      setModalVisible(false);
      fetchUOMs();
    } catch (error) {
      message.error('Failed to save UOM');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    // Local filtering since we don't have server-side filtering for UOMs
  };

  const handleTypeChange = (value) => {
    setSelectedType(value);
    setTimeout(fetchUOMs, 0);
  };

  const filteredUOMs = uoms.filter(uom => {
    if (searchText && !uom.name.toLowerCase().includes(searchText.toLowerCase()) && 
        !uom.abbreviation.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getTypeColor = (type) => {
    const colors = {
      weight: 'blue',
      volume: 'green',
      length: 'purple',
      count: 'orange',
      other: 'default'
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Abbreviation',
      dataIndex: 'abbreviation',
      key: 'abbreviation',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={getTypeColor(type)}>
          {type.toUpperCase()}
        </Tag>
      ),
      filters: uomTypes.map(type => ({ text: type.toUpperCase(), value: type })),
      onFilter: (value, record) => record.type === value,
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
            title="Are you sure you want to delete this UOM?"
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
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>Units of Measurement</Title>
          <Text type="secondary">
            Define units of measurement for your items
          </Text>
        </div>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add UOM
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by name or abbreviation"
          allowClear
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 240 }}
          prefix={<SearchOutlined />}
        />
        
        <Select
          placeholder="Filter by type"
          style={{ width: 160 }}
          value={selectedType}
          onChange={handleTypeChange}
        >
          <Option value="all">All Types</Option>
          {uomTypes.map(type => (
            <Option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Option>
          ))}
        </Select>
        
        <Button onClick={fetchUOMs} loading={loading}>
          Refresh
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredUOMs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingUOM ? 'Edit Unit of Measurement' : 'Add Unit of Measurement'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        confirmLoading={confirmLoading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter name' }]}
            tooltip={{ 
              title: 'Full name of the unit (e.g., Kilogram, Liter)',
              icon: <InfoCircleOutlined /> 
            }}
          >
            <Input placeholder="Enter name (e.g., Kilogram)" />
          </Form.Item>

          <Form.Item
            name="abbreviation"
            label="Abbreviation"
            rules={[{ required: true, message: 'Please enter abbreviation' }]}
            tooltip={{ 
              title: 'Short form of the unit (e.g., kg, L)',
              icon: <InfoCircleOutlined /> 
            }}
          >
            <Input placeholder="Enter abbreviation (e.g., kg)" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: 'Please select type' }]}
            tooltip={{ 
              title: 'Category of measurement',
              icon: <InfoCircleOutlined /> 
            }}
          >
            <Select placeholder="Select type">
              {uomTypes.map(type => (
                <Option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={confirmLoading}>
                {editingUOM ? 'Update' : 'Create'}
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

export default UOMManagement;
