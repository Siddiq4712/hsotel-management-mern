import React, { useState } from 'react';
import { Card, Tabs, DatePicker, Button, Select, Form, Row, Col, Spin, Empty, message, Divider } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Printer } from "lucide-react";
import moment from 'moment';
import api from '../services/api';
import { Bar, Pie, Line } from 'react-chartjs-2';
import 'chart.js/auto';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const MessReportsPage = () => {
  const [inventoryForm] = Form.useForm();
  const [consumptionForm] = Form.useForm();
  const [expenseForm] = Form.useForm();
  const [menuForm] = Form.useForm();
  
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);

  React.useEffect(() => {
    // Fetch categories and expense types on load
    fetchCategories();
    fetchExpenseTypes();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/mess/item-categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchExpenseTypes = async () => {
    try {
      const response = await api.get('/mess/expense-types');
      setExpenseTypes(response.data.data);
    } catch (error) {
      console.error('Failed to fetch expense types:', error);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setReportData(null);
  };

  const generateInventoryReport = async (values) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (values.category_id) params.append('category_id', values.category_id);
      if (values.low_stock) params.append('low_stock', values.low_stock);
      if (values.date_range) {
        params.append('date_range', `${values.date_range[0].format('YYYY-MM-DD')},${values.date_range[1].format('YYYY-MM-DD')}`);
      }

      const response = await api.get(`/mess/reports/inventory?${params.toString()}`);
      setReportData(response.data.data);
    } catch (error) {
      console.error('Failed to generate inventory report:', error);
      message.error('Failed to generate inventory report');
    } finally {
      setLoading(false);
    }
  };

  const generateConsumptionReport = async (values) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', values.date_range[0].format('YYYY-MM-DD'));
      params.append('end_date', values.date_range[1].format('YYYY-MM-DD'));
      if (values.meal_type) params.append('meal_type', values.meal_type);
      if (values.item_id) params.append('item_id', values.item_id);

      const response = await api.get(`/mess/reports/consumption?${params.toString()}`);
      setReportData(response.data.data);
    } catch (error) {
      console.error('Failed to generate consumption report:', error);
      message.error('Failed to generate consumption report');
    } finally {
      setLoading(false);
    }
  };

  const generateExpenseReport = async (values) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (values.report_type === 'monthly') {
        params.append('month', values.month.month() + 1);
        params.append('year', values.month.year());
      } else {
        params.append('start_date', values.date_range[0].format('YYYY-MM-DD'));
        params.append('end_date', values.date_range[1].format('YYYY-MM-DD'));
      }

      const response = await api.get(`/mess/reports/expenses?${params.toString()}`);
      setReportData(response.data.data);
    } catch (error) {
      console.error('Failed to generate expense report:', error);
      message.error('Failed to generate expense report');
    } finally {
      setLoading(false);
    }
  };

  const generateMenuReport = async (values) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', values.date_range[0].format('YYYY-MM-DD'));
      params.append('end_date', values.date_range[1].format('YYYY-MM-DD'));

      const response = await api.get(`/mess/reports/menu-planning?${params.toString()}`);
      setReportData(response.data.data);
    } catch (error) {
      console.error('Failed to generate menu planning report:', error);
      message.error('Failed to generate menu planning report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!reportData) return;
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Create CSV header and content based on active tab
    if (activeTab === '1' && reportData.itemStocks) {
      csvContent += 'Item,Category,Current Stock,Minimum Stock,Status,Last Updated\n';
      reportData.itemStocks.forEach(stock => {
        const status = parseFloat(stock.current_stock) <= parseFloat(stock.minimum_stock) ? 
          'Low Stock' : 'In Stock';
        csvContent += `"${stock.Item.name}","${stock.Item.tbl_ItemCategory?.name || 'N/A'}",${stock.current_stock},${stock.minimum_stock},"${status}","${moment(stock.last_updated).format('YYYY-MM-DD')}"\n`;
      });
    } else if (activeTab === '2' && reportData.dailyConsumption) {
      csvContent += 'Date,Item,Category,Quantity Consumed,Meal Type\n';
      reportData.dailyConsumption.forEach(consumption => {
        csvContent += `"${moment(consumption.consumption_date).format('YYYY-MM-DD')}","${consumption.Item.name}","${consumption.Item.tbl_ItemCategory?.name || 'N/A'}",${consumption.quantity_consumed},"${consumption.meal_type}"\n`;
      });
    } else if (activeTab === '3' && reportData.expenses) {
      csvContent += 'Date,Expense Type,Amount,Description\n';
      reportData.expenses.forEach(expense => {
        csvContent += `"${moment(expense.expense_date).format('YYYY-MM-DD')}","${expense.ExpenseType?.name || 'N/A'}",${expense.amount},"${expense.description || ''}"\n`;
      });
    } else if (activeTab === '4' && reportData.menuSchedules) {
      csvContent += 'Date,Meal Time,Menu Name,Status\n';
      reportData.menuSchedules.forEach(schedule => {
        csvContent += `"${moment(schedule.scheduled_date).format('YYYY-MM-DD')}","${schedule.meal_time}","${schedule.Menu?.name || 'N/A'}","${schedule.status}"\n`;
      });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab}-report-${moment().format('YYYY-MM-DD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render charts and tables based on the data
  const renderReport = () => {
    if (!reportData) return <Empty description="No report data. Generate a report to see results." />;

    switch (activeTab) {
      case '1': // Inventory Report
        return renderInventoryReport();
      case '2': // Consumption Report
        return renderConsumptionReport();
      case '3': // Expense Report
        return renderExpenseReport();
      case '4': // Menu Planning Report
        return renderMenuPlanningReport();
      default:
        return <Empty description="Select a report type" />;
    }
  };

  const renderInventoryReport = () => {
    if (!reportData.itemStocks) return <Empty description="No inventory data available" />;

    // Prepare data for low stock vs in stock pie chart
    const lowStockCount = reportData.itemStocks.filter(stock => 
      parseFloat(stock.current_stock) <= parseFloat(stock.minimum_stock)
    ).length;
    
    const stockStatusData = {
      labels: ['Low Stock', 'In Stock'],
      datasets: [{
        data: [lowStockCount, reportData.itemStocks.length - lowStockCount],
        backgroundColor: ['#ff4d4f', '#52c41a'],
        hoverBackgroundColor: ['#ff7875', '#73d13d']
      }]
    };

    return (
      <div className="inventory-report">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Stock Status">
              <div style={{ height: 300 }}>
                <Pie data={stockStatusData} options={{ maintainAspectRatio: false }} />
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Summary">
              <p><strong>Total Items:</strong> {reportData.summary.totalItems}</p>
              <p><strong>Total Stock Value:</strong> ₹{reportData.summary.totalStockValue.toFixed(2)}</p>
              <p><strong>Low Stock Items:</strong> {reportData.summary.lowStockItems}</p>
            </Card>
          </Col>
        </Row>

        <Card title="Inventory Details" style={{ marginTop: 16 }}>
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Minimum Stock</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {reportData.itemStocks.map((stock, index) => (
                  <tr key={index}>
                      <td>{stock.Item?.name || 'N/A'}</td>
                      <td>{stock.Item?.tbl_ItemCategory?.name || 'N/A'}</td>
                      <td>{stock.current_stock ?? 0} {stock.Item?.UOM?.abbreviation || 'units'}</td>
                      <td>{stock.minimum_stock ?? 0} {stock.Item?.UOM?.abbreviation || 'units'}</td>

                    <td>
                      <span style={{ 
                        color: parseFloat(stock.current_stock) <= parseFloat(stock.minimum_stock) ? 'red' : 'green',
                        fontWeight: 'bold'
                      }}>
                        {parseFloat(stock.current_stock) <= parseFloat(stock.minimum_stock) ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td>{moment(stock.last_updated).format('YYYY-MM-DD')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderConsumptionReport = () => {
  if (!reportData?.dailyConsumption) {
    return <Empty description="No consumption data available" />;
  }

  // Prepare data for consumption by meal type chart
  const mealTypeData = {
    labels: (reportData.consumptionByMealType || []).map(item =>
      item.meal_type.charAt(0).toUpperCase() + item.meal_type.slice(1)
    ),
    datasets: [
      {
        label: 'Consumption by Meal Type',
        data: (reportData.consumptionByMealType || []).map(item =>
          parseFloat(item.total_quantity)
        ),
        backgroundColor: ['#1890ff', '#52c41a', '#722ed1', '#faad14'],
      },
    ],
  };

  return (
    <div className="consumption-report">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Consumption by Meal Type">
            <div style={{ height: 300 }}>
              {reportData.consumptionByMealType &&
              reportData.consumptionByMealType.length > 0 ? (
                <Pie data={mealTypeData} options={{ maintainAspectRatio: false }} />
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <p>No meal type consumption data available</p>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Consumption Details" style={{ marginTop: 16 }}>
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Meal Type</th>
              </tr>
            </thead>
            <tbody>
              {reportData.dailyConsumption.map((consumption, index) => (
                <tr key={index}>
                  <td>{moment(consumption.consumption_date).format('YYYY-MM-DD')}</td>
                  <td>{consumption.Item.name}</td>
                  <td>{consumption.Item.tbl_ItemCategory?.name || 'N/A'}</td>
                  <td>{consumption.quantity_consumed} {consumption.unit}</td>
                  <td>
                    {consumption.meal_type.charAt(0).toUpperCase() +
                      consumption.meal_type.slice(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

  const renderExpenseReport = () => {
    if (!reportData.expenses) return <Empty description="No expense data available" />;

    // Prepare data for expense by type chart
    const expenseByTypeData = {
      labels: reportData.expensesByType.map(item => item.type_name || 'Other'),
      datasets: [{
        label: 'Expenses by Type',
        data: reportData.expensesByType.map(item => parseFloat(item.total_amount)),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#8AC249', '#EA8A95', '#00D8B6', '#4A6EB4'
        ]
      }]
    };

    // Prepare data for daily expenses chart
    const dailyExpensesData = {
      labels: reportData.dailyExpenses.map(item => moment(item.date).format('MMM DD')),
      datasets: [{
        label: 'Daily Expenses',
        data: reportData.dailyExpenses.map(item => parseFloat(item.total_amount)),
        backgroundColor: '#36A2EB',
        borderColor: '#36A2EB'
      }]
    };

    return (
      <div className="expense-report">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Expenses by Type">
              <div style={{ height: 300 }}>
                {reportData.expensesByType && reportData.expensesByType.length > 0 ? (
                  <Pie data={expenseByTypeData} options={{ maintainAspectRatio: false }} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p>No expense type data available</p>
                  </div>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Daily Expenses">
              <div style={{ height: 300 }}>
                {reportData.dailyExpenses && reportData.dailyExpenses.length > 0 ? (
                  <Line data={dailyExpensesData} options={{ maintainAspectRatio: false }} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p>No daily expense data available</p>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        <Card title="Summary" style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <div className="summary-item">
                <h3>Total Other Expenses</h3>
                <p>₹ {reportData.summary.totalOtherExpenses.toFixed(2)}</p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="summary-item">
                <h3>Total Supplier Bills</h3>
                <p>₹ {reportData.summary.totalSupplierBills.toFixed(2)}</p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="summary-item">
                <h3>Total Expenses</h3>
                <p>₹ {reportData.summary.totalExpenses.toFixed(2)}</p>
              </div>
            </Col>
          </Row>
        </Card>

        <Card title="Expense Details" style={{ marginTop: 16 }}>
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense Type</th>
                  <th>Amount</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {reportData.expenses.map((expense, index) => (
                  <tr key={index}>
                    <td>{moment(expense.expense_date).format('YYYY-MM-DD')}</td>
                    <td>{expense.ExpenseType?.name || 'N/A'}</td>
                    <td>₹ {parseFloat(expense.amount).toFixed(2)}</td>
                    <td>{expense.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Supplier Bills" style={{ marginTop: 16 }}>
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Bill Number</th>
                  <th>Supplier</th>
                  <th>Bill Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.supplierBills.map((bill, index) => (
                  <tr key={index}>
                    <td>{bill.bill_number}</td>
                    <td>{bill.Supplier?.name || 'N/A'}</td>
                    <td>{moment(bill.bill_date).format('YYYY-MM-DD')}</td>
                    <td>{moment(bill.due_date).format('YYYY-MM-DD')}</td>
                    <td>₹ {parseFloat(bill.total_amount).toFixed(2)}</td>
                    <td>
                      <span style={{
                        color: bill.status === 'paid' ? 'green' : bill.status === 'pending' ? 'orange' : 'red'
                      }}>
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderMenuPlanningReport = () => {
    if (!reportData.menuSchedules) return <Empty description="No menu planning data available" />;

    // Prepare data for meal type counts chart
    const mealTypeData = {
      labels: Object.keys(reportData.mealTypeCounts).map(type => type.charAt(0).toUpperCase() + type.slice(1)),
      datasets: [{
        label: 'Meal Type Counts',
        data: Object.values(reportData.mealTypeCounts),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
        hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }]
    };

    // Prepare data for top menu items chart
    const topItemsData = {
      labels: reportData.topMenuItems.map(item => item.item_name),
      datasets: [{
        label: 'Most Used Menu Items',
        data: reportData.topMenuItems.map(item => item.count),
        backgroundColor: '#36A2EB'
      }]
    };

    return (
      <div className="menu-planning-report">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Meal Type Distribution">
              <div style={{ height: 300 }}>
                <Pie data={mealTypeData} options={{ maintainAspectRatio: false }} />
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Top Menu Items">
              <div style={{ height: 300 }}>
                <Bar 
                  data={topItemsData} 
                  options={{ 
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                      x: {
                        beginAtZero: true
                      }
                    }
                  }} 
                />
              </div>
            </Card>
          </Col>
        </Row>

        <Card title="Menu Schedule by Date" style={{ marginTop: 16 }}>
          {Object.entries(reportData.schedulesByDate).map(([date, schedules]) => (
            <div key={date} className="date-schedules">
              <Divider orientation="left">{moment(date).format('dddd, MMMM D, YYYY')}</Divider>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Meal</th>
                      <th>Menu</th>
                      <th>Items</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(schedule => (
                      <tr key={schedule.id}>
                        <td>{schedule.meal_time.charAt(0).toUpperCase() + schedule.meal_time.slice(1)}</td>
                        <td>{schedule.Menu?.name || 'N/A'}</td>
                        <td>
                          {schedule.Menu?.tbl_Menu_Items && schedule.Menu.tbl_Menu_Items.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                              {schedule.Menu.tbl_Menu_Items.slice(0, 3).map(item => (
                                <li key={item.id}>{item.tbl_Item?.name}</li>
                              ))}
                              {schedule.Menu.tbl_Menu_Items.length > 3 && <li>...</li>}
                            </ul>
                          ) : (
                            'No items'
                          )}
                        </td>
                        <td>{schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
  };

  return (
    <Card title="Mess Reports" bordered={false}>
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="Inventory Report" key="1">
          <Form
            form={inventoryForm}
            layout="inline"
            onFinish={generateInventoryReport}
            style={{ marginBottom: 16 }}
          >
            <Form.Item name="category_id" label="Category">
              <Select style={{ width: 180 }} placeholder="Select category" allowClear>
                <Option value="">All Categories</Option>
                {categories.map(category => (
                  <Option key={category.id} value={category.id}>{category.name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="low_stock" label="Low Stock Only" valuePropName="checked">
              <Select style={{ width: 120 }}>
                <Option value="">All Stock</Option>
                <Option value="true">Low Stock Only</Option>
              </Select>
            </Form.Item>
            <Form.Item name="date_range" label="Date Range">
              <RangePicker style={{ width: 280 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Generate Report
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
        <TabPane tab="Consumption Report" key="2">
          <Form
            form={consumptionForm}
            layout="inline"
            onFinish={generateConsumptionReport}
            style={{ marginBottom: 16 }}
          >
            <Form.Item 
              name="date_range" 
              label="Date Range"
              rules={[{ required: true, message: 'Please select date range' }]}
            >
              <RangePicker style={{ width: 280 }} />
            </Form.Item>
            <Form.Item name="meal_type" label="Meal Type">
              <Select style={{ width: 150 }} placeholder="All meals" allowClear>
                <Option value="">All Meals</Option>
                <Option value="breakfast">Breakfast</Option>
                <Option value="lunch">Lunch</Option>
                <Option value="dinner">Dinner</Option>
                <Option value="snacks">Snacks</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Generate Report
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
        <TabPane tab="Expense Report" key="3">
          <Form
            form={expenseForm}
            layout="inline"
            onFinish={generateExpenseReport}
            style={{ marginBottom: 16 }}
          >
            <Form.Item 
              name="report_type" 
              label="Report Type"
              initialValue="monthly"
            >
              <Select style={{ width: 150 }} onChange={(value) => {
                expenseForm.setFieldsValue({ 
                  month: undefined, 
                  date_range: undefined 
                });
              }}>
                <Option value="monthly">Monthly</Option>
                <Option value="custom">Custom Range</Option>
              </Select>
            </Form.Item>
            <Form.Item 
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.report_type !== currentValues.report_type}
            >
              {({ getFieldValue }) => 
                getFieldValue('report_type') === 'monthly' ? (
                  <Form.Item 
                    name="month" 
                    label="Month"
                    rules={[{ required: true, message: 'Please select month' }]}
                  >
                    <DatePicker picker="month" style={{ width: 150 }} />
                  </Form.Item>
                ) : (
                  <Form.Item 
                    name="date_range" 
                    label="Date Range"
                    rules={[{ required: true, message: 'Please select date range' }]}
                  >
                    <RangePicker style={{ width: 280 }} />
                  </Form.Item>
                )
              }
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Generate Report
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
        <TabPane tab="Menu Planning Report" key="4">
          <Form
            form={menuForm}
            layout="inline"
            onFinish={generateMenuReport}
            style={{ marginBottom: 16 }}
          >
            <Form.Item 
              name="date_range" 
              label="Date Range"
              rules={[{ required: true, message: 'Please select date range' }]}
            >
              <RangePicker style={{ width: 280 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Generate Report
              </Button>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Generating report...</p>
        </div>
      ) : (
        <div className="report-content">
          {reportData && (
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button 
                icon={<Printer />} 
                onClick={handlePrint}
                style={{ marginRight: 8 }}
              >
                Print
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleExport}
              >
                Export CSV
              </Button>
            </div>
          )}
          {renderReport()}
        </div>
      )}

      <style jsx>{`
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }
        .report-table th, .report-table td {
          padding: 0.75rem;
          border: 1px solid #dee2e6;
        }
        .report-table th {
          background-color: #f8f9fa;
          font-weight: 600;
        }
        .summary-item {
          padding: 1rem;
          background-color: #f8f9fa;
          border-radius: 0.25rem;
          text-align: center;
        }
        .summary-item h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          color: #666;
        }
        .summary-item p {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        .table-responsive {
          overflow-x: auto;
        }
        @media print {
          .ant-card-head, form, .ant-tabs-nav, button {
            display: none !important;
          }
        }
      `}</style>
    </Card>
  );
};

export default MessReportsPage;
