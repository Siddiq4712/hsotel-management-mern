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
      // Refresh the bills list
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
      
      // Refresh the list
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
      title: 'Student',
      dataIndex: 'MessBillStudent',
      key: 'student',
      render: (student) => <span>{student?.username}</span>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `₹${parseFloat(amount).toFixed(2)}`
    },
    {
      title: 'Due Date',
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
        if (status === 'pending') color = 'gold';
        if (status === 'paid') color = 'green';
        if (status === 'overdue') color = 'red';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status !== 'paid' && (
            <Button 
              type="primary" 
              size="small" 
              onClick={() => handleStatusChange(record.id, 'paid')}
            >
              Mark Paid
            </Button>
          )}
          {record.status === 'pending' && (
            <Button 
              danger 
              size="small" 
              onClick={() => handleStatusChange(record.id, 'overdue')}
            >
              Mark Overdue
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={2}>Mess Bill Management</Title>
      
      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card title="Generate Mess Bills">
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
                label="Amount Per Day (₹)"
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  min={1}
                  step={1}
                  style={{ width: '100%' }}
                  placeholder="Enter daily amount"
                />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Generate Bills
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        
        <Col xs={24} lg={16}>
          <Card title="Summary">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic 
                  title="Total Bills" 
                  value={summary.totalBills} 
                  suffix={<Text type="secondary">bills</Text>} 
                />
                <Statistic 
                  title="Total Amount" 
                  value={summary.totalAmount} 
                  precision={2}
                  prefix="₹" 
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Pending Bills" 
                  value={summary.pendingBills} 
                  suffix={<Text type="secondary">bills</Text>}
                />
                <Statistic 
                  title="Pending Amount" 
                  value={summary.pendingAmount} 
                  precision={2}
                  prefix="₹" 
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Paid Bills" 
                  value={summary.paidBills} 
                  suffix={<Text type="secondary">bills</Text>}
                />
                <Statistic 
                  title="Paid Amount" 
                  value={summary.paidAmount} 
                  precision={2}
                  prefix="₹" 
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Divider />
      
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
        dataSource={reportData}
        rowKey="studentId"
        loading={loading}
        scroll={{ x: 1500 }}
        pagination={{
          pageSize: 10, // Sets the default page size
          showSizeChanger: true,
          pageSizeOptions: ['10', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
        }}
      />
      </Card>
    </div>
  );
};

export default GenerateMessBills;
