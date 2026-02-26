import React, { useState, useEffect } from 'react';
import {
  Card, Form, Select, Input, InputNumber, Button, message, Spin, Table, Row, Col, DatePicker, Typography, Modal, Switch, Popconfirm, Space
} from 'antd';
import { PlusOutlined, SyncOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const CreditTokenManager = () => {
  const [entryForm] = Form.useForm();
  const [concernForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState([]);
  const [concerns, setConcerns] = useState([]);
  
  const [tableLoading, setTableLoading] = useState(false);
  const [isConcernModalVisible, setIsConcernModalVisible] = useState(false);
  const [isEntryModalVisible, setIsEntryModalVisible] = useState(false);

  const [editingConcern, setEditingConcern] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);

  // --- Data Fetching ---
  const fetchConcerns = async () => {
    try {
      const response = await messAPI.getConcerns();
      setConcerns(response.data.data || []);
    } catch (error) {
      message.error('Failed to load concerns master list.');
    }
  };
  
  const fetchRecentEntries = async () => {
    setTableLoading(true);
    try {
      const response = await messAPI.getCreditTokens();
      setRecentEntries(response.data.data || []);
    } catch (error) {
      message.error('Failed to load recent entries.');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchConcerns();
    fetchRecentEntries();
  }, []);

  // --- Handlers for Credit Token Entries ---
  const openEntryModal = (record = null) => {
    setEditingEntry(record);
    if (record) {
        entryForm.setFieldsValue({
            ...record,
            date: moment(record.date),
            concern_id: record.Concern?.id
        });
    } else {
        entryForm.resetFields();
    }
    setIsEntryModalVisible(true);
  };

  const handleEntryFinish = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values, date: values.date.format('YYYY-MM-DD') };
      if (editingEntry) {
        await messAPI.updateCreditToken(editingEntry.id, payload);
        message.success('Entry updated successfully!');
      } else {
        await messAPI.createCreditToken(payload);
        message.success('New entry saved successfully!');
      }
      setIsEntryModalVisible(false);
      fetchRecentEntries();
    } catch (error) {
      message.error(`Failed to save entry: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    try {
      await messAPI.deleteCreditToken(id);
      message.success('Entry deleted successfully.');
      fetchRecentEntries();
    } catch (error) {
      message.error(`Failed to delete entry: ${error.message}`);
    }
  };

  // --- Handlers for Concerns (Master List) ---
  const openConcernModal = (record = null) => {
    setEditingConcern(record);
    concernForm.setFieldsValue(record || { name: '', description: '', is_active: true });
    setIsConcernModalVisible(true);
  };
  
  const handleConcernFinish = async (values) => {
    try {
      if (editingConcern) {
        await messAPI.updateConcern(editingConcern.id, values);
        message.success('Concern updated!');
      } else {
        await messAPI.createConcern(values);
        message.success('New concern added!');
      }
      setIsConcernModalVisible(false);
      fetchConcerns();
    } catch (error) {
      message.error(`Failed to save concern: ${error.message}`);
    }
  };

  // --- Table Columns ---
  const entryColumns = [
    { title: 'Date', dataIndex: 'date', render: (date) => moment(date).format('YYYY-MM-DD'), sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix() },
    { title: 'Concern Name', dataIndex: ['Concern', 'name'], sorter: (a, b) => a.Concern.name.localeCompare(b.Concern.name) },
    { title: 'Amount (₹)', dataIndex: 'amount', align: 'right', render: (amt) => parseFloat(amt).toFixed(2), sorter: (a, b) => a.amount - b.amount },
    { title: 'Recorded By', dataIndex: ['RecordedBy', 'userName'] },
    { title: 'Actions', key: 'actions', align: 'center', render: (_, record) => (
        <Space>
            <Button icon={<EditOutlined />} onClick={() => openEntryModal(record)} size="small" />
            <Popconfirm title="Are you sure you want to delete this entry?" onConfirm={() => handleDeleteEntry(record.id)} okText="Yes" cancelText="No">
                <Button icon={<DeleteOutlined />} danger size="small" />
            </Popconfirm>
        </Space>
    )}
  ];

  const concernColumns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Status', dataIndex: 'is_active', render: (active) => active ? 'Active' : 'Inactive' },
    { title: 'Action', render: (_, record) => <Button icon={<EditOutlined />} onClick={() => openConcernModal(record)} size="small" /> }
  ];

  return (
    <div>
      <Title level={3}>Credit Token Management (Sister Concern Bills)</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="Credit Token Entries"
            extra={
              <Space>
                <Button icon={<SyncOutlined />} onClick={fetchRecentEntries} loading={tableLoading}>Refresh</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openEntryModal()}>Add Entry</Button>
              </Space>
            }
          >
            <Table columns={entryColumns} dataSource={recentEntries} rowKey="id" loading={tableLoading} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 800 }}/>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Manage Concerns" extra={<Button onClick={() => openConcernModal()}>Add Concern</Button>}>
              <Table columns={concernColumns} dataSource={concerns} rowKey="id" size="small" pagination={{ pageSize: 5 }}/>
          </Card>
        </Col>
      </Row>

      {/* Modal for Creating/Editing Credit Token Entries */}
      <Modal
        title={editingEntry ? 'Edit Credit Token Entry' : 'Add New Credit Token Entry'}
        visible={isEntryModalVisible}
        onCancel={() => setIsEntryModalVisible(false)}
        onOk={() => entryForm.submit()}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={entryForm} layout="vertical" onFinish={handleEntryFinish}>
            <Form.Item name="concern_id" label="Select Concern" rules={[{ required: true }]}>
              <Select placeholder="Choose a concern from the master list" showSearch filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}>
                {concerns.map((c) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="date" label="Date of Entry" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
              <InputNumber min={0.01} style={{ width: '100%' }} precision={2} />
            </Form.Item>
        </Form>
      </Modal>

      {/* Modal for Creating/Editing Concerns (Master List) */}
      <Modal
        title={editingConcern ? 'Edit Concern' : 'Add New Concern'}
        visible={isConcernModalVisible}
        onCancel={() => setIsConcernModalVisible(false)}
        onOk={() => concernForm.submit()}
        destroyOnClose
      >
        <Form form={concernForm} layout="vertical" onFinish={handleConcernFinish}>
            <Form.Item name="name" label="Concern Name" rules={[{ required: true }]}>
                <Input placeholder="e.g., K.R. Memorial Scholarship Meeting" />
            </Form.Item>
            <Form.Item name="description" label="Description (Optional)">
                <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="is_active" label="Status" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" defaultChecked />
            </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CreditTokenManager;
