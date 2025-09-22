import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Input, Select, Form, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Option } = Select;

const UOMManagement = () => {
  const [form] = Form.useForm();
  const [uoms, setUOMs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUOM, setEditingUOM] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchUOMs();
  }, []);

  const fetchUOMs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mess/uoms');
      setUOMs(response.data.data);
    } catch (error) {
      console.error('Failed to fetch UOMs:', error);
      message.error('Failed to load units of measurement');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
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
      await api.delete(`/mess/uoms/${id}`);
      message.success('Unit of measurement deleted successfully');
      fetchUOMs();
    } catch (error) {
      console.error('Failed to delete UOM:', error);
      message.error('Failed to delete unit of measurement');
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingUOM) {
        await api.put(`/mess/uoms/${editingUOM.id}`, values);
        message.success('Unit of measurement updated successfully');
      } else {
        await api.post('/mess/uoms', values);
        message.success('Unit of measurement added successfully');
      }
      setModalVisible(false);
      fetchUOMs();
    } catch (error) {
      console.error('Failed to save UOM:', error);
      message.error('Failed to save unit of measurement');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUOMs = uoms.filter(uom => {
    const matchesType = typeFilter === 'all' || uom.type === typeFilter;
    const matchesSearch = 
      uom.name.toLowerCase().includes(searchText.toLowerCase()) ||
      uom.abbreviation.toLowerCase().includes(searchText.toLowerCase());
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
      title: 'Abbreviation',
      dataIndex: 'abbreviation',
      key: 'abbreviation',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: text => text.charAt(0).toUpperCase() + text.slice(1),
      filters: [
        { text: 'Weight', value: 'weight' },
        { text: 'Volume', value: 'volume' },
        { text: 'Length', value: 'length' },
        { text: 'Count', value: 'count' },
        { text: 'Other', value: 'other' },
      ],
      onFilter: (value, record) => record.type === value,
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
            onClick={() => {
              Modal.confirm({
                title: 'Delete Unit of Measurement',
                content: `Are you sure you want to delete ${record.name}?`,
                onOk: () => handleDelete(record.id)
              });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <Card title="Units of Measurement" bordered={false}>
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Add UOM
          </Button>
          <Input
            placeholder="Search UOMs"
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Select
            placeholder="Filter by type"
            style={{ width: 150 }}
            onChange={value => setTypeFilter(value)}
            value={typeFilter}
          >
            <Option value="all">All Types</Option>
            <Option value="weight">Weight</Option>
            <Option value="volume">Volume</Option>
            <Option value="length">Length</Option>
            <Option value="count">Count</Option>
            <Option value="other">Other</Option>
          </Select>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredUOMs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingUOM ? "Edit Unit of Measurement" : "Add Unit of Measurement"}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter UOM name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="abbreviation"
            label="Abbreviation"
            rules={[{ required: true, message: 'Please enter abbreviation' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: 'Please select UOM type' }]}
          >
            <Select placeholder="Select UOM type">
              <Option value="weight">Weight</Option>
              <Option value="volume">Volume</Option>
              <Option value="length">Length</Option>
              <Option value="count">Count</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={submitting}
              >
                {editingUOM ? "Update" : "Add"}
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
