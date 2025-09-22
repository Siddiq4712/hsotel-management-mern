import React, { useState, useEffect } from 'react';
import { Card, Tabs, Form, DatePicker, InputNumber, Select, Button, message, Table, Row, Col, Statistic } from 'antd';
import { 
  DollarCircleOutlined, 
  UserOutlined, 
  CalendarOutlined, 
  BarcodeOutlined, 
  ShoppingCartOutlined 
} from '@ant-design/icons';
import { Input } from "antd";
import moment from 'moment';
import api from '../../services/api';

const { TabPane } = Tabs;
const { Option } = Select;

const DailyOperations = () => {
  const [chargeForm] = Form.useForm();
  const [expenseForm] = Form.useForm();
  const [attendanceForm] = Form.useForm();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [students, setStudents] = useState([]);
  
  useEffect(() => {
    fetchExpenseTypes();
    const today = moment().format('YYYY-MM-DD');
    attendanceForm.setFieldsValue({ date: moment() });
    fetchAttendanceStats(today);
  }, []);

  const fetchExpenseTypes = async () => {
    try {
      const response = await api.get('/mess/expense-types');
      setExpenseTypes(response.data.data);
    } catch (error) {
      console.error('Failed to fetch expense types:', error);
      message.error('Failed to load expense types');
    }
  };

  const fetchAttendanceStats = async (date) => {
    setLoading(true);
    try {
      const response = await api.get(`/mess/attendance-stats?date=${date}`);
      setAttendanceStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
      message.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDailyCharges = async (values) => {
    setSubmitting(true);
    try {
      await api.post('/mess/charges/calculate-daily', {
        date: values.date.format('YYYY-MM-DD'),
        daily_rate: values.daily_rate
      });
      message.success('Daily charges applied successfully');
      chargeForm.resetFields();
    } catch (error) {
      console.error('Failed to apply daily charges:', error);
      message.error('Failed to apply daily charges');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExpense = async (values) => {
    setSubmitting(true);
    try {
      await api.post('/mess/expenses', {
        expense_type_id: values.expense_type_id,
        amount: values.amount,
        description: values.description,
        expense_date: values.expense_date.format('YYYY-MM-DD')
      });
      message.success('Expense recorded successfully');
      expenseForm.resetFields();
    } catch (error) {
      console.error('Failed to record expense:', error);
      message.error('Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckAttendance = async (values) => {
    const date = values.date.format('YYYY-MM-DD');
    fetchAttendanceStats(date);
  };

  const calculateAttendanceCount = (status) => {
    if (!attendanceStats || !attendanceStats.attendance) return 0;
    const statusRecord = attendanceStats.attendance.find(a => a.status === status);
    return statusRecord ? parseInt(statusRecord.count) : 0;
  };

  const attendanceColumns = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => status.charAt(0).toUpperCase() + status.slice(1)
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count'
    }
  ];

  return (
    <Card title="Daily Operations" bordered={false}>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Daily Charges" key="1">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Apply Daily Charges" bordered={false}>
                <Form
                  form={chargeForm}
                  layout="vertical"
                  onFinish={handleApplyDailyCharges}
                  initialValues={{ date: moment(), daily_rate: 100 }}
                >
                  <Form.Item
                    name="date"
                    label="Date"
                    rules={[{ required: true, message: 'Please select a date' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                  
                  <Form.Item
                    name="daily_rate"
                    label="Daily Rate (₹)"
                    rules={[{ required: true, message: 'Please enter daily rate' }]}
                  >
                    <InputNumber
                      min={1}
                      step={0.01}
                      style={{ width: '100%' }}
                      formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/₹\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      icon={<DollarCircleOutlined />}
                      block
                    >
                      Apply Daily Charges
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card title="Information" bordered={false}>
                <p>
                  <strong>Daily Charges</strong> are calculated based on student attendance and the daily rate you set.
                </p>
                <p>
                  Only students marked as <strong>present</strong> and not on approved leave will be charged.
                </p>
                <p>
                  This operation will:
                </p>
                <ul>
                  <li>Check attendance status for each student</li>
                  <li>Verify if any student is on approved leave</li>
                  <li>Apply the daily rate to eligible students</li>
                  <li>Create charge records for each student</li>
                </ul>
                <p>
                  You can view and manage these charges in the Mess Bills section.
                </p>
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab="Daily Expenses" key="2">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Record Daily Expense" bordered={false}>
                <Form
                  form={expenseForm}
                  layout="vertical"
                  onFinish={handleCreateExpense}
                  initialValues={{ expense_date: moment() }}
                >
                  <Form.Item
                    name="expense_type_id"
                    label="Expense Type"
                    rules={[{ required: true, message: 'Please select expense type' }]}
                  >
                    <Select placeholder="Select expense type">
                      {expenseTypes.map(type => (
                        <Option key={type.id} value={type.id}>{type.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="amount"
                    label="Amount (₹)"
                    rules={[{ required: true, message: 'Please enter amount' }]}
                  >
                    <InputNumber
                      min={0.01}
                      step={0.01}
                      style={{ width: '100%' }}
                      formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/₹\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="description"
                    label="Description"
                  >
                    <Input.TextArea rows={3} placeholder="Enter expense description" />
                  </Form.Item>
                  
                  <Form.Item
                    name="expense_date"
                    label="Expense Date"
                    rules={[{ required: true, message: 'Please select expense date' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      icon={<ShoppingCartOutlined />}
                      block
                    >
                      Record Expense
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card title="Information" bordered={false}>
                <p>
                  <strong>Daily Expenses</strong> are used to track all miscellaneous expenses in the mess.
                </p>
                <p>
                  These expenses are included in the monthly mess bill calculation.
                </p>
                <p>
                  Common daily expenses include:
                </p>
                <ul>
                  <li>Vegetables and fruits purchased locally</li>
                  <li>Emergency groceries</li>
                  <li>Disposable items</li>
                  <li>Cleaning supplies</li>
                  <li>Transportation costs</li>
                </ul>
                <p>
                  Larger purchases should be made through the Purchase Order system.
                </p>
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab="Attendance Check" key="3">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Check Attendance for Date" bordered={false}>
                <Form
                  form={attendanceForm}
                  layout="vertical"
                  onFinish={handleCheckAttendance}
                  initialValues={{ date: moment() }}
                >
                  <Form.Item
                    name="date"
                    label="Date"
                    rules={[{ required: true, message: 'Please select a date' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                  
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<CalendarOutlined />}
                      block
                    >
                      Check Attendance
                    </Button>
                  </Form.Item>
                </Form>
                
                {attendanceStats && (
                  <div style={{ marginTop: 24 }}>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Statistic
                          title="Present"
                          value={calculateAttendanceCount('present')}
                          prefix={<UserOutlined style={{ color: 'green' }} />}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Absent"
                          value={calculateAttendanceCount('absent')}
                          prefix={<UserOutlined style={{ color: 'red' }} />}
                        />
                      </Col>
                    </Row>
                    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                      <Col span={12}>
                        <Statistic
                          title="On Leave"
                          value={attendanceStats.onLeave || 0}
                          prefix={<CalendarOutlined style={{ color: 'blue' }} />}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="Date"
                          value={moment(attendanceStats.date).format('DD MMM YYYY')}
                          prefix={<CalendarOutlined />}
                        />
                      </Col>
                    </Row>
                    
                    <Table 
                      columns={attendanceColumns} 
                      dataSource={attendanceStats.attendance || []} 
                      rowKey="status"
                      pagination={false}
                      style={{ marginTop: 24 }}
                    />
                  </div>
                )}
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card title="Information" bordered={false}>
                <p>
                  <strong>Attendance Check</strong> allows you to see how many students are present for a given day.
                </p>
                <p>
                  This information is useful for:
                </p>
                <ul>
                  <li>Planning meal quantities</li>
                  <li>Calculating daily expenses</li>
                  <li>Applying appropriate daily charges</li>
                </ul>
                <p>
                  Students on approved leave are not charged for mess on those days.
                </p>
                <p>
                  Attendance records are managed by the warden and are used to calculate mess bills.
                </p>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default DailyOperations;
