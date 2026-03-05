import React, { useState, useEffect } from 'react';
import { 
  Card, Form, DatePicker, InputNumber, Button, message, Table, Tag, Space, 
  Statistic, Row, Col, Typography, Divider
} from 'antd';
import { wardenAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;

const GenerateMessBills = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [billsLoading, setBillsLoading] = useState(false);
  const [messBills, setMessBills] = useState([]);
  const [summary, setSummary] = useState({
    totalBills: 0,
    totalAmount: 0,
    pendingBills: 0,
    pendingAmount: 0,
    paidBills: 0,
    paidAmount: 0
  });
  const [currentMonth, setCurrentMonth] = useState(moment());

  useEffect(() => {
    if (currentMonth) {
      fetchMessBills(currentMonth.month() + 1, currentMonth.year());
    }
  }, [currentMonth]);

  const fetchMessBills = async (month, year) => {
    setBillsLoading(true);
    try {
      const response = await wardenAPI.getMessBills({ month, year });
      setMessBills(response.data.data.bills || []);
      setSummary({
        totalBills: response.data.data.totalBills || 0,
        totalAmount: response.data.data.totalAmount || 0,
        pendingBills: response.data.data.pendingBills || 0,
        pendingAmount: response.data.data.pendingAmount || 0,
        paidBills: response.data.data.paidBills || 0,
        paidAmount: response.data.data.paidAmount || 0
      });
    } catch (error) {
      console.error('Error fetching mess bills:', error);
      message.error('Failed to load mess bills');
    } finally {
      setBillsLoading(false);
    }
  };

  const handleGenerate = async (values) => {
    setLoading(true);
    try {
      const month = values.month.month() + 1;
      const year = values.month.year();
      
      await wardenAPI.generateMessBills({
        month,
        year,
        amount_per_day: values.amount_per_day
      });
      
      message.success('Mess bills generated successfully');
      fetchMessBills(month, year);
      form.resetFields();
      
    } catch (error) {
      console.error('Error generating mess bills:', error);
      message.error('Failed to generate mess bills: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await wardenAPI.updateMessBillStatus(id, { status });
      message.success(`Bill status updated to ${status}`);
      
      if (currentMonth) {
        fetchMessBills(currentMonth.month() + 1, currentMonth.year());
      }
    } catch (error) {
      console.error('Error updating bill status:', error);
      message.error('Failed to update bill status');
    }
  };

  const columns = [
    {
      title: 'Student Name',
      dataIndex: 'MessBillStudent',
      key: 'student',
      render: (student) => <span>{student?.userName}</span>
    },
    {
      title: 'Total Fee',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `₹${parseFloat(amount).toFixed(2)}`
    },
    {
      title: 'Last Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date) => moment(date).format('DD/MM/YYYY')
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'blue';
        let label = status.toUpperCase();
        if (status === 'pending') { color = 'gold'; label = 'UNPAID'; }
        if (status === 'paid') { color = 'green'; label = 'PAID'; }
        if (status === 'overdue') { color = 'red'; label = 'DUE LAPSED'; }
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: 'Payment Action',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status !== 'paid' && (
            <Button 
              type="primary" 
              size="small" 
              onClick={() => handleStatusChange(record.id, 'paid')}
            >
              Mark as Paid
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Updated Title */}
      <Title level={2}>Monthly Mess Fees</Title>
      
      <Row gutter={16}>
        {/* Generate Bills */}
        <Col xs={24} lg={8}>
          <Card title="Create Monthly Bills">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleGenerate}
            >
              <Form.Item
                name="month"
                label="Month"
                rules={[{ required: true, message: 'Please select month' }]}
              >
                <DatePicker 
                  picker="month" 
                  style={{ width: '100%' }} 
                />
              </Form.Item>
              
              <Form.Item
                name="amount_per_day"
                label="Daily Mess Rate (₹)"
                rules={[{ required: true, message: 'Please enter the daily rate' }]}
              >
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  placeholder="e.g. 150"
                />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Generate Bills for Month
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        
        {/* Collection Report */}
        <Col xs={24} lg={16}>
          <Card title="Collection Report">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="Total Students" value={summary.totalBills} />
                <Statistic title="Total Expected" value={summary.totalAmount} prefix="₹" />
              </Col>
              <Col span={8}>
                <Statistic title="Unpaid Students" value={summary.pendingBills} />
                <Statistic title="Unpaid Amount" value={summary.pendingAmount} prefix="₹" />
              </Col>
              <Col span={8}>
                <Statistic title="Paid Students" value={summary.paidBills} />
                <Statistic title="Amount Collected" value={summary.paidAmount} prefix="₹" />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Divider />
      
      {/* Mess Bills Table */}
      <Card title="Mess Bills">
        <Space style={{ marginBottom: 16 }}>
          <DatePicker 
            picker="month" 
            value={currentMonth}
            onChange={value => setCurrentMonth(value)}
          />
        </Space>
        
        <Table
          columns={columns}
          dataSource={messBills}
          rowKey="id"
          loading={billsLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default GenerateMessBills;
