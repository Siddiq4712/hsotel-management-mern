import React, { useState, useEffect } from 'react';
import {
  Card, DatePicker, Button, message, Table, Row, Col,
  Typography, Tooltip, Popconfirm, Spin, Collapse, Badge, Empty, Alert
} from 'antd';
import {
  DollarSign, Calendar, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, FileText, Coffee, Calculator, Clock, ChevronDown
} from 'lucide-react';
import { wardenAPI, messAPI } from '../../services/api';
import moment from 'moment';
const { Title, Text } = Typography;
const { Panel } = Collapse;
const MessBillManagement = () => {
  const [loading, setLoading] = useState(false);
  const [billsLoading, setBillsLoading] = useState(false);
  const [messBills, setMessBills] = useState([]);
  const [dailyCosts, setDailyCosts] = useState([]);
  const [calculatingCosts, setCalculatingCosts] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [summary, setSummary] = useState({
    totalBills: 0,
    totalAmount: 0,
    pendingBills: 0,
    pendingAmount: 0,
    paidBills: 0,
    paidAmount: 0,
    averageDailyCost: 0,
    daysWithMeals: 0,
    totalMonthCost: 0
  });
  const [debugInfo, setDebugInfo] = useState(null);
  useEffect(() => {
    if (selectedMonth) {
      fetchMessBills(selectedMonth.month() + 1, selectedMonth.year());
      fetchDailyCosts(selectedMonth.month() + 1, selectedMonth.year());
    }
  }, [selectedMonth]);
  const fetchMessBills = async (month, year) => {
    setBillsLoading(true);
    try {
      const response = await wardenAPI.getMessBills({ month, year });
      setMessBills(response.data.data.bills || []);
      setSummary(prevSummary => ({
        ...prevSummary,
        totalBills: response.data.data.totalBills || 0,
        totalAmount: response.data.data.totalAmount || 0,
        pendingBills: response.data.data.pendingBills || 0,
        pendingAmount: response.data.data.pendingAmount || 0,
        paidBills: response.data.data.paidBills || 0,
        paidAmount: response.data.data.paidAmount || 0
      }));
    } catch (error) {
      console.error('Error fetching mess bills:', error);
      message.error('Failed to load mess bills');
    } finally {
      setBillsLoading(false);
    }
  };
  const fetchDailyCosts = async (month, year) => {
    setCalculatingCosts(true);
    try {
      // Create start and end dates for the month
      const startDate = moment({ year, month: month - 1, day: 1 }).format('YYYY-MM-DD');
      const endDate = moment({ year, month: month - 1, day: 1 }).endOf('month').format('YYYY-MM-DD');
     
      console.log(`Fetching menu schedules from ${startDate} to ${endDate}`);
     
      // Fetch the served menus for the month
      const response = await messAPI.getMenuSchedule({ start_date: startDate, end_date: endDate });
     
      // Debug info
      const allMenusCount = response.data.data.length;
      const servedMenus = response.data.data.filter(schedule => schedule.status === 'served');
      const servedMenusCount = servedMenus.length;
      console.log(`Total menus in response: ${allMenusCount}, Served menus: ${servedMenusCount}`);
     
      // Save first few menus for debugging
      const sampleMenus = response.data.data.slice(0, 3).map(m => ({
        id: m.id,
        date: m.scheduled_date,
        meal: m.meal_time,
        status: m.status,
        menu_name: m.Menu?.name || 'Unknown'
      }));
     
      setDebugInfo({
        dateRange: `${startDate} to ${endDate}`,
        totalMenusFound: allMenusCount,
        servedMenusFound: servedMenusCount,
        sampleMenus
      });
     
      // Create daily cost mapping
      const dailyCostsMap = {};
     
      // Initialize with 0 cost for each day of the month
      const daysInMonth = moment({ year, month: month - 1 }).daysInMonth();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateString = moment({ year, month: month - 1, day }).format('YYYY-MM-DD');
        dailyCostsMap[dateString] = {
          total: 0,
          meals: []
        };
      }
     
      // Sum up cost_per_serving for each day, accounting for multiple meals per day
      servedMenus.forEach(menu => {
        const dateString = moment(menu.scheduled_date).format('YYYY-MM-DD');
        const costPerServing = parseFloat(menu.cost_per_serving || 0);
       
        console.log(`Adding menu for ${dateString}: ${menu.meal_time}, cost: ${costPerServing}`);
       
        if (dailyCostsMap[dateString]) {
          dailyCostsMap[dateString].total += costPerServing;
          dailyCostsMap[dateString].meals.push({
            meal_time: menu.meal_time,
            cost: costPerServing,
            menu_name: menu.Menu?.name || 'Unknown menu'
          });
        }
      });
     
      // Convert to array for easier display
      const dailyCostsArray = Object.keys(dailyCostsMap).map(date => ({
        date,
        total_cost: dailyCostsMap[date].total,
        meals: dailyCostsMap[date].meals
      })).sort((a, b) => moment(a.date).diff(moment(b.date)));
     
      setDailyCosts(dailyCostsArray);
     
      // Calculate average daily cost (only for days with meals)
      const daysWithMeals = dailyCostsArray.filter(day => day.total_cost > 0).length;
      const totalMonthCost = dailyCostsArray.reduce((sum, item) => sum + item.total_cost, 0);
      const averageDailyCost = daysWithMeals > 0 ? totalMonthCost / daysWithMeals : 0;
     
      console.log(`Days with meals: ${daysWithMeals}, Total month cost: ${totalMonthCost}, Average daily cost: ${averageDailyCost}`);
     
      setSummary(prevSummary => ({
        ...prevSummary,
        averageDailyCost,
        daysWithMeals,
        totalMonthCost
      }));
     
    } catch (error) {
      console.error('Error fetching daily costs:', error);
      message.error('Failed to calculate daily costs');
      setDebugInfo({
        error: error.message,
        stack: error.stack
      });
    } finally {
      setCalculatingCosts(false);
    }
  };
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const month = selectedMonth.month() + 1;
      const year = selectedMonth.year();
     
      if (summary.averageDailyCost <= 0) {
        message.warning('No served menus found for this month. Please ensure menus are served before generating bills.');
        return;
      }
     
      await wardenAPI.generateMessBills({
        month,
        year,
        amount_per_day: summary.averageDailyCost
      });
     
      message.success('Mess bills generated successfully');
      // Refresh the bills list
      fetchMessBills(month, year);
     
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
      const month = selectedMonth.month() + 1;
      const year = selectedMonth.year();
      fetchMessBills(month, year);
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
      title: 'Bill Amount',
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
      title: 'Payment Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color, icon, label = status.toUpperCase();
        if (status === 'pending') {
          color = 'bg-yellow-100 text-yellow-800';
          icon = <AlertTriangle size={16} className="mr-1 text-yellow-500" />;
          label = 'UNPAID';
        } else if (status === 'paid') {
          color = 'bg-green-100 text-green-800';
          icon = <CheckCircle size={16} className="mr-1 text-green-500" />;
        } else if (status === 'overdue') {
          color = 'bg-red-100 text-red-800';
          icon = <XCircle size={16} className="mr-1 text-red-500" />;
          label = 'LAPSED';
        }
       
        return (
          <span className={`px-2 py-1 rounded-full text-xs flex items-center w-fit ${color}`}>
            {icon} {label}
          </span>
        );
      }
    },
    {
      title: 'Update Payment',
      key: 'actions',
      render: (_, record) => (
        <div className="flex space-x-2">
          {record.status !== 'paid' && (
            <Tooltip title="Mark as Paid">
              <button
                className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                onClick={() => handleStatusChange(record.id, 'paid')}
              >
                <CheckCircle size={16} />
              </button>
            </Tooltip>
          )}
          {record.status === 'pending' && (
            <Tooltip title="Mark as Lapsed">
              <button
                className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                onClick={() => handleStatusChange(record.id, 'overdue')}
              >
                <XCircle size={16} />
              </button>
            </Tooltip>
          )}
          {record.status !== 'pending' && (
            <Tooltip title="Reset to Unpaid">
              <Popconfirm
                title="Reset bill status?"
                description="Are you sure you want to reset this bill to unpaid status?"
                onConfirm={() => handleStatusChange(record.id, 'pending')}
                okText="Yes"
                cancelText="No"
              >
                <button className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">
                  <RefreshCw size={16} />
                </button>
              </Popconfirm>
            </Tooltip>
          )}
        </div>
      )
    }
  ];
  const dailyCostColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => moment(date).format('DD MMM YYYY')
    },
    {
      title: 'Daily Rate',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (cost, record) => (
        <div>
          {cost > 0 ? (
            <div className="flex items-center justify-between">
              <span className="font-medium">₹{cost.toFixed(2)}</span>
              <Badge count={record.meals.length} showZero={false} size="small" className="ml-2" />
            </div>
          ) : (
            <span className="text-gray-500">No meals served</span>
          )}
        </div>
      )
    },
    {
      title: 'Meal Details',
      key: 'meals',
      render: (_, record) => (
        record.meals.length > 0 ? (
          <Collapse
            ghost
            expandIcon={({ isActive }) => (
              <ChevronDown size={16} className={`transition-transform ${isActive ? 'rotate-180' : ''}`} />
            )}
          >
            <Panel header={`View ${record.meals.length} meals`} key="1">
              <ul className="space-y-2">
                {record.meals.map((meal, index) => (
                  <li key={index} className="text-sm">
                    <div className="flex items-center">
                      <div className="flex items-center min-w-40">
                        <Clock size={12} className="mr-1" />
                        <span className="capitalize">{meal.meal_time}</span>
                      </div>
                      <div className="ml-4">
                        <span className="text-blue-600 font-medium">₹{meal.cost.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-gray-500 text-xs ml-4 mt-1">{meal.menu_name}</div>
                  </li>
                ))}
              </ul>
            </Panel>
          </Collapse>
        ) : (
          <span className="text-gray-500">-</span>
        )
      )
    }
  ];
  const handleMonthChange = (value) => {
    setSelectedMonth(value || moment());
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>Mess Bill Register</Title>
      </div>
     
      {debugInfo && debugInfo.error && (
        <Alert
          message="Error Fetching Menu Data"
          description={
            <div>
              <p><strong>Error:</strong> {debugInfo.error}</p>
              <p className="mt-2 text-xs whitespace-pre-wrap">{debugInfo.stack}</p>
            </div>
          }
          type="error"
          showIcon
          closable
        />
      )}
     
      {debugInfo && !debugInfo.error && debugInfo.servedMenusFound === 0 && (
        <Alert
          message="No Served Menus Found"
          description={
            <div>
              <p>We found {debugInfo.totalMenusFound} menus for the period {debugInfo.dateRange}, but none are marked as 'served'.</p>
              <p className="mt-2">Please make sure to mark your menus as served in the Menu Schedule management.</p>
            </div>
          }
          type="warning"
          showIcon
          closable
        />
      )}
     
      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card title={<div className="flex items-center"><Calculator className="mr-2" size={18} /> Create Monthly Bills</div>} className="h-full">
            <div className="mb-4">
              <div className="text-gray-700 mb-2">Select Month</div>
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="w-full"
              />
            </div>
           
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-blue-700">Average Daily Rate</span>
                {calculatingCosts && <Spin size="small" />}
              </div>
              <div className="text-2xl font-semibold text-blue-900">₹{summary.averageDailyCost.toFixed(2)}</div>
              <div className="text-sm text-blue-700 mt-2">
                <div className="flex items-center">
                  <Coffee size={14} className="mr-1" />
                  Based on {summary.daysWithMeals} days with {dailyCosts.reduce((sum, day) => sum + day.meals.length, 0)} meals
                </div>
              </div>
              <div className="text-xs text-blue-700 mt-1">
                Total month cost: ₹{summary.totalMonthCost.toFixed(2)}
              </div>
            </div>
           
            <div className="mb-4 text-sm text-gray-500">
              <ul className="list-disc pl-5 space-y-1">
                <li>Bills are calculated based on meals actually served</li>
                <li>Daily rate is the sum of breakfast, lunch, and dinner</li>
                <li>Students on 'OD Leave' will not be charged for those days</li>
                <li>Ensure mess manager has marked all meals as 'Served'</li>
              </ul>
            </div>
           
            <Button
              type="primary"
              onClick={handleGenerate}
              loading={loading}
              disabled={calculatingCosts || summary.averageDailyCost <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Generate Bills for {selectedMonth.format('MMMM YYYY')}
            </Button>
           
            {debugInfo && debugInfo.sampleMenus && (
              <div className="mt-4 border rounded p-3 text-xs">
                <div className="font-medium mb-2">Meal Data Status</div>
                <p>Found {debugInfo.totalMenusFound} total menus, {debugInfo.servedMenusFound} served.</p>
                {debugInfo.sampleMenus.length > 0 && (
                  <div>
                    <div className="mt-2">Sample menus:</div>
                    <ul className="list-disc pl-4 mt-1">
                      {debugInfo.sampleMenus.map((menu, i) => (
                        <li key={i}>
                          {menu.date} - {menu.meal} - {menu.status} - {menu.menu_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
       
        <Col xs={24} lg={16}>
          <Card title={<div className="flex items-center"><FileText className="mr-2" size={18} /> Payment Collection Status</div>} className="h-full">
            <Row gutter={16} className="mb-4">
              <Col span={8}>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-700 mb-1">Total Registered</div>
                  <div className="text-2xl font-semibold text-blue-900">{summary.totalBills}</div>
                  <div className="text-lg font-medium text-blue-800">₹{summary.totalAmount.toFixed(2)}</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-sm text-yellow-700 mb-1">Unpaid Bills</div>
                  <div className="text-2xl font-semibold text-yellow-900">{summary.pendingBills}</div>
                  <div className="text-lg font-medium text-yellow-800">₹{summary.pendingAmount.toFixed(2)}</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-700 mb-1">Collected</div>
                  <div className="text-2xl font-semibold text-green-900">{summary.paidBills}</div>
                  <div className="text-lg font-medium text-green-800">₹{summary.paidAmount.toFixed(2)}</div>
                </div>
              </Col>
            </Row>
            <Card
              title={<div className="text-gray-700 font-medium">Daily Rate Details</div>}
              className="mb-4"
              size="small"
              bodyStyle={{ maxHeight: "350px", overflow: "auto" }}
            >
              {calculatingCosts ? (
                <div className="flex justify-center items-center py-8">
                  <Spin />
                </div>
              ) : dailyCosts.filter(day => day.total_cost > 0).length > 0 ? (
                <Table
                  columns={dailyCostColumns}
                  dataSource={dailyCosts}
                  rowKey="date"
                  pagination={false}
                  size="small"
                />
              ) : (
                <Empty
                  description="No served menus found for this month"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Card>
        </Col>
      </Row>
      <Card title={<div className="flex items-center"><DollarSign className="mr-2" size={18} /> Mess Bills for {selectedMonth.format('MMMM YYYY')}</div>}>
        <Table
          columns={columns}
          dataSource={messBills}
          rowKey="id"
          loading={billsLoading}
          pagination={{ pageSize: 10 }}
          className="mt-4"
          locale={{ emptyText: "No bills found for the selected month" }}
        />
      </Card>
    </div>
  );
};
export default MessBillManagement;