import React, { useState, useEffect } from 'react';
import {
  Card, Form, Select, Input, InputNumber, Button, message, Spin, Table, Row, Col, DatePicker, Typography
} from 'antd';
import { PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { messAPI, wardenAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;

const PaperBillGenerator = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [recentFees, setRecentFees] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const fetchSessions = async () => {
    try {
      // This call will now work because of the backend route fix
      const response = await wardenAPI.getSessions();
      console.log('[PaperBillGenerator] Fetched sessions:', response.data.data); // LOG
      setSessions(response.data.data || []);
    } catch (error) {
      console.error('[PaperBillGenerator] Error fetching sessions:', error); // LOG
      message.error(`Failed to load sessions: ${error.message}`);
    }
  };

  const fetchRecentFees = async () => {
    setTableLoading(true);
    try {
      const response = await messAPI.getStudentFees({ fee_type: 'paper_bill' });
      const fees = response.data.data || [];
      console.log('[PaperBillGenerator] Fetched recent paper bill fees:', fees); // LOG
      setRecentFees(fees);
    } catch (error) {
      message.error('Failed to load recent fees.');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchRecentFees();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        fee_type: 'paper_bill',
        month: values.month.month() + 1,
        year: values.month.year(),
      };
      
      console.log('[PaperBillGenerator] Sending payload to create bulk fee:', payload); // LOG

      const response = await messAPI.createBulkStudentFee(payload);
      
      console.log('[PaperBillGenerator] Received response from bulk fee creation:', response.data); // LOG

      message.success(response.data.message);
      form.resetFields();
      fetchRecentFees();
    } catch (error) {
      console.error('[PaperBillGenerator] Error creating bulk fee:', error); // LOG
      message.error(`Failed to create bill: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'createdAt', render: (date) => moment(date).format('YYYY-MM-DD HH:mm') },
    { title: 'Description', dataIndex: 'description' },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      align: 'right',
      render: (amt) => {
        const num = parseFloat(amt);
        return isNaN(num) ? 'N/A' : num.toFixed(2);
      },
    },
    { title: 'Student', dataIndex: ['Student', 'username'], render: (text) => text || 'N/A' },
    { title: 'Month/Year', render: (_, record) => `${record.month}/${record.year}` },
    { title: 'Issued By', dataIndex: ['IssuedBy', 'username'], render: (text) => text || 'N/A' },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <Card title="Create New Paper Bill">
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item name="session_id" label="Select Session" rules={[{ required: true, message: 'Please select a session!' }]}>
              <Select placeholder="Choose a session" loading={sessions.length === 0}>
                {sessions.map((session) => (
                  <Option key={session.id} value={session.id}>
                    {session.name} ({moment(session.start_date).format('YYYY')} - {moment(session.end_date).format('YYYY')})
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="description" label="Bill Description" rules={[{ required: true, message: 'Please enter a description!' }]}>
              <Input placeholder="e.g., Exam Paper Fee - October" />
            </Form.Item>
            <Form.Item name="month" label="Applicable Month" rules={[{ required: true, message: 'Please select the month!' }]}>
                <DatePicker.MonthPicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="amount" label="Amount per Student (₹)" rules={[{ required: true, message: 'Please enter an amount!' }]}>
              <InputNumber min={1} style={{ width: '100%' }} precision={2} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>
                Apply Bill to Session
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={16}>
        <Card title="Recently Created Paper Bills" extra={<Button icon={<SyncOutlined />} onClick={fetchRecentFees} loading={tableLoading} />}>
          <Table columns={columns} dataSource={recentFees} rowKey="id" loading={tableLoading} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 800 }}/>
        </Card>
      </Col>
    </Row>
  );
};

export default PaperBillGenerator;
