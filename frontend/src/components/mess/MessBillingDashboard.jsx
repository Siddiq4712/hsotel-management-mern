import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, DatePicker, Button, Table, message, Space, Modal, Spin } from 'antd';
import { DollarOutlined, UserOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '../../services/api';
import moment from 'moment';
import { Bar, Pie } from 'react-chartjs-2';
import 'chart.js/auto';

const { Option } = Select;
const { MonthPicker } = DatePicker;

const MessBillingDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [month, setMonth] = useState(moment().month() + 1);
  const [year, setYear] = useState(moment().year());
  const [billingData, setBillingData] = useState(null);
  const [expenseData, setExpenseData] = useState(null);
  const [consumptionData, setConsumptionData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch expense data for pie chart
      const expensesResponse = await api.get(`/mess/reports/expenses?month=${month}&year=${year}`);
      setExpenseData(expensesResponse.data.data);

      // Fetch consumption data
            // Fetch consumption data
      const startDate = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
      const endDate = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
      const consumptionResponse = await api.get(`/mess/reports/consumption?start_date=${startDate}&end_date=${endDate}`);
      setConsumptionData(consumptionResponse.data.data);

      // Fetch monthly mess report for billing data
      const messReportResponse = await api.get(`/mess/reports/monthly?month=${month}&year=${year}`);
      setBillingData(messReportResponse.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      message.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (date) => {
    if (date) {
      setMonth(date.month() + 1);
      setYear(date.year());
    }
  };

  const handleGenerateBills = async () => {
    Modal.confirm({
      title: 'Generate Mess Bills',
      content: `Are you sure you want to generate mess bills for ${moment(`${year}-${month}-01`).format('MMMM YYYY')}?`,
      onOk: async () => {
        setGenerating(true);
        try {
          await api.post('/mess/bills/generate', { month, year });
          message.success('Mess bills generated successfully');
          fetchData();
        } catch (error) {
          console.error('Failed to generate bills:', error);
          message.error('Failed to generate mess bills');
        } finally {
          setGenerating(false);
        }
      }
    });
  };

  const handleAllocateFees = async () => {
    Modal.confirm({
      title: 'Allocate Mess Fees',
      content: `Are you sure you want to allocate mess fees for ${moment(`${year}-${month}-01`).format('MMMM YYYY')}?`,
      onOk: async () => {
        setGenerating(true);
        try {
          await api.post('/mess/fees/allocate', { month, year });
          message.success('Mess fees allocated successfully');
          fetchData();
        } catch (error) {
          console.error('Failed to allocate fees:', error);
          message.error('Failed to allocate mess fees');
        } finally {
          setGenerating(false);
        }
      }
    });
  };

  // Prepare expense data for pie chart
  const prepareExpenseChart = () => {
    if (!expenseData || !expenseData.expensesByType) return null;

    const labels = expenseData.expensesByType.map(item => item.type_name || 'Other');
    const values = expenseData.expensesByType.map(item => parseFloat(item.total_amount));

    return {
      labels,
      datasets: [
        {
          label: 'Expenses by Category',
          data: values,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#8AC249', '#EA8A95', '#00D8B6', '#4A6EB4'
          ],
          hoverBackgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#8AC249', '#EA8A95', '#00D8B6', '#4A6EB4'
          ]
        }
      ]
    };
  };

  // Prepare daily expenses for bar chart
  const prepareDailyExpensesChart = () => {
    if (!expenseData || !expenseData.dailyExpenses) return null;

    const labels = expenseData.dailyExpenses.map(item => moment(item.date).format('DD'));
    const values = expenseData.dailyExpenses.map(item => parseFloat(item.total_amount));

    return {
      labels,
      datasets: [
        {
          label: 'Daily Expenses',
          data: values,
          backgroundColor: '#36A2EB',
          borderColor: '#36A2EB',
          borderWidth: 1
        }
      ]
    };
  };

  // Prepare consumption by meal type chart
  const prepareMealTypeChart = () => {
    if (!consumptionData || !consumptionData.consumptionByMealType) return null;

    const labels = consumptionData.consumptionByMealType.map(item => item.meal_type.charAt(0).toUpperCase() + item.meal_type.slice(1));
    const values = consumptionData.consumptionByMealType.map(item => parseFloat(item.total_quantity));

    return {
      labels,
      datasets: [
        {
          label: 'Consumption by Meal Type',
          data: values,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
          hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
        }
      ]
    };
  };

  // Student bills table columns
  const columns = [
    {
      title: 'Student',
      dataIndex: 'studentName',
      key: 'studentName',
      sorter: (a, b) => a.studentName.localeCompare(b.studentName),
    },
    {
      title: 'Days Present',
      dataIndex: 'daysPresent',
      key: 'daysPresent',
      sorter: (a, b) => a.daysPresent - b.daysPresent,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `₹ ${parseFloat(amount).toFixed(2)}`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <span style={{
          color: status === 'paid' ? 'green' : status === 'pending' ? 'orange' : 'red'
        }}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    }
  ];

  return (
    <div className="mess-billing-dashboard">
      <Card bordered={false}>
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6} lg={6}>
            <DatePicker
              picker="month"
              value={moment(`${year}-${month}-01`)}
              onChange={handleMonthChange}
              format="MMMM YYYY"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={9} lg={9}>
            <Space>
              <Button
                type="primary"
                onClick={handleGenerateBills}
                loading={generating}
                icon={<FileTextOutlined />}
              >
                Generate Bills
              </Button>
              <Button
                type="default"
                onClick={handleAllocateFees}
                loading={generating}
                icon={<DollarOutlined />}
              >
                Allocate Fees
              </Button>
            </Space>
          </Col>
          <Col xs={24} sm={24} md={9} lg={9} style={{ textAlign: 'right' }}>
            <Button
              type="link"
              onClick={fetchData}
              disabled={loading}
            >
              Refresh Data
            </Button>
          </Col>
        </Row>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>Loading billing data...</p>
          </div>
        ) : !billingData ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>No billing data available for {moment(`${year}-${month}-01`).format('MMMM YYYY')}</p>
          </div>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Expenses"
                    value={billingData.summary.totalExpenses || 0}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ color: '#3f8600' }}
                    suffix=""
                    icon={<DollarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Man-days"
                    value={billingData.summary.totalManDays || 0}
                    valueStyle={{ color: '#1890ff' }}
                    prefix={<UserOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Per Day Cost"
                    value={billingData.summary.perDayCost || 0}
                    precision={2}
                    prefix="₹"
                    valueStyle={{ color: '#cf1322' }}
                    icon={<CalendarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Student Bills"
                    value={billingData.studentBills ? billingData.studentBills.length : 0}
                    valueStyle={{ color: '#722ed1' }}
                    prefix={<FileTextOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24} md={12}>
                <Card title="Expense Distribution">
                  <div style={{ height: 300 }}>
                    {expenseData && expenseData.expensesByType ? (
                      <Pie data={prepareExpenseChart()} options={{ maintainAspectRatio: false }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p>No expense data available</p>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Daily Expenses">
                  <div style={{ height: 300 }}>
                    {expenseData && expenseData.dailyExpenses && expenseData.dailyExpenses.length > 0 ? (
                      <Bar data={prepareDailyExpensesChart()} options={{ maintainAspectRatio: false }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p>No daily expense data available</p>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>

            <Card title="Student Bills" style={{ marginTop: 16 }}>
              <Table
                columns={columns}
                dataSource={billingData.studentBills || []}
                rowKey="studentId"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </>
        )}
      </Card>
    </div>
  );
};

export default MessBillingDashboard;

