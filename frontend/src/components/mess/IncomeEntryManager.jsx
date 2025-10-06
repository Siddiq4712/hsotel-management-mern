import React, { useState, useEffect } from 'react';
import {
  Card, Form, Select, Input, InputNumber, Button, message, Spin, Table, Row, Col, DatePicker, Typography
} from 'antd';
import { PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const IncomeEntryManager = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const fetchRecentEntries = async () => {
    setTableLoading(true);
    try {
      const response = await messAPI.getIncomeEntries();
      setRecentEntries(response.data.data || []);
    } catch (error) {
      message.error('Failed to load recent entries.');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentEntries();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      };
      
      await messAPI.createIncomeEntry(payload);
      message.success(`Entry for '${values.type}' saved successfully!`);
      form.resetFields();
      fetchRecentEntries();
    } catch (error) {
      message.error(`Failed to save entry: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'received_date', render: (date) => moment(date).format('YYYY-MM-DD') },
    { title: 'Type', dataIndex: ['IncomeType', 'name'] },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Amount (₹)', dataIndex: 'amount', align: 'right', render: (amt) => parseFloat(amt).toFixed(2) },
    { title: 'Recorded By', dataIndex: ['IncomeReceivedBy', 'username'] },
  ];

  return (
    <div>
      <Title level={3}>Income & Deduction Entries</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="Add New Entry">
            <Spin spinning={loading}>
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item name="type" label="Entry Type" rules={[{ required: true }]}>
                  <Select placeholder="Select entry type">
                    <Option value="Sister Concern Bill">Sister Concern Bill (Credit Token)</Option>
                    <Option value="Cash Token">Cash Token (Less)</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="date" label="Date of Entry" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
                  <InputNumber min={0.01} style={{ width: '100%' }} precision={2} placeholder="Enter the total amount"/>
                </Form.Item>
                <Form.Item name="description" label="Description / Details (Optional)">
                  <TextArea rows={2} placeholder="e.g., K.R. Memorial scholarship meeting" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Save Entry</Button>
                </Form.Item>
              </Form>
            </Spin>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Recent Entries" extra={<Button icon={<SyncOutlined />} onClick={fetchRecentEntries} loading={tableLoading} />}>
            <Table
              columns={columns}
              dataSource={recentEntries}
              rowKey="id"
              loading={tableLoading}
              size="small"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default IncomeEntryManager;
