import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Row, Col, Statistic, List, Tag, Button, Spin, Empty, 
  Typography, Space, Divider, ConfigProvider, theme 
} from 'antd';
import {
  LayoutDashboard, Utensils, ClipboardList, AlertTriangle, 
  Calendar, Coffee, ShoppingBag, TrendingUp, BarChart3, 
  PlusCircle, CreditCard, Calculator, ChevronRight, Clock
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

// Set Chart.js Defaults for Light Theme
ChartJS.defaults.color = '#64748b'; // slate-500
ChartJS.defaults.borderColor = '#f1f5f9'; // slate-100

const { Title, Text } = Typography;

const MessDashboard = ({ setCurrentView }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayMenus, setTodayMenus] = useState([]);
  const [menusLoading, setMenusLoading] = useState(true);
  const [specialOrders, setSpecialOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [monthlyExpensesData, setMonthlyExpensesData] = useState(null);
  const [itemStockData, setItemStockData] = useState(null);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchTodayMenus();
    fetchSpecialOrders();
    fetchChartData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await messAPI.getMessDashboardStats();
      setDashboardData(response.data.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchTodayMenus = async () => {
    setMenusLoading(true);
    try {
      const today = moment().format('YYYY-MM-DD');
      const response = await messAPI.getMenuSchedule({ start_date: today, end_date: today });
      setTodayMenus(response.data.data || []);
    } catch (error) { console.error(error); } finally { setMenusLoading(false); }
  };

  const fetchSpecialOrders = async () => {
    setOrdersLoading(true);
    try {
      const today = moment().format('YYYY-MM-DD');
      const response = await messAPI.getFoodOrders({ from_date: today, to_date: today, status: 'pending,confirmed,preparing' });
      setSpecialOrders(response.data.data || []);
    } catch (error) { console.error(error); } finally { setOrdersLoading(false); }
  };

  const fetchChartData = async () => {
    setChartsLoading(true);
    try {
      const currentMonth = moment().month() + 1;
      const currentYear = moment().year();
      const [expenses, stock] = await Promise.all([
        messAPI.getMonthlyExpensesChartData({ month: currentMonth, year: currentYear }),
        messAPI.getItemStockChartData(),
      ]);
      setMonthlyExpensesData(expenses.data.data);
      setItemStockData(stock.data.data);
    } catch (error) { console.error(error); } finally { setChartsLoading(false); }
  };

  // UI Helpers
  const getMealColor = (mealType) => {
    const colors = { breakfast: '#3b82f6', lunch: '#10b981', dinner: '#8b5cf6', snacks: '#f59e0b' };
    return colors[mealType] || '#3b82f6';
  };

  const upcomingMenu = useMemo(() => {
    const hour = moment().hour();
    let next = 'breakfast';
    if (hour < 10) next = 'breakfast';
    else if (hour < 15) next = 'lunch';
    else if (hour < 18) next = 'snacks';
    else next = 'dinner';
    return todayMenus.find(m => m.meal_time === next);
  }, [todayMenus]);

  // Shared Card Style for Light Theme
  const cardStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0', // slate-200
    borderRadius: '16px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb', // blue-600
          colorBgContainer: '#ffffff',
          borderRadius: 16,
          colorTextHeading: '#1e293b', // slate-800
          colorText: '#475569', // slate-600
        },
      }}
    >
      <div className="p-8 bg-slate-50 min-h-screen">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                <LayoutDashboard className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Mess Overview</Title>
              <Text type="secondary">Manage your daily operations and logistics</Text>
            </div>
          </div>
          <Text strong className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            {moment().format('dddd, Do MMMM YYYY')}
          </Text>
        </div>
        
        {/* Stats Section */}
        <Row gutter={[24, 24]}>
          {[
            { title: 'Total Menus', value: dashboardData?.totalMenus, icon: <Utensils size={22}/>, color: 'text-blue-600', bg: 'bg-blue-50', link: 'menus' },
            { title: 'Meals Today', value: todayMenus.length, icon: <Calendar size={22}/>, color: 'text-emerald-600', bg: 'bg-emerald-50', link: 'menu-planner' },
            { title: 'Special Orders', value: specialOrders.length, icon: <ShoppingBag size={22}/>, color: 'text-orange-600', bg: 'bg-orange-50', link: 'food-orders-dashboard' },
            { title: 'Low Stock', value: dashboardData?.lowStockCount, icon: <AlertTriangle size={22}/>, color: 'text-rose-600', bg: 'bg-rose-50', link: 'inventory' },
          ].map((stat, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card style={cardStyle} className="hover:shadow-md transition-shadow cursor-default border-none">
                <div className="flex justify-between items-start">
                    <div>
                      <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.title}</Text>
                      <div className="mt-1">
                        <Title level={3} style={{ margin: 0 }}>{loading ? <Spin size="small"/> : stat.value}</Title>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                        {stat.icon}
                    </div>
                </div>
                <Button 
                    type="link" 
                    className="p-0 h-auto mt-4 text-blue-600 flex items-center gap-1 font-medium"
                    onClick={() => setCurrentView(stat.link)}
                >
                    View Details <ChevronRight size={14} />
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
        
        <Row gutter={[24, 24]} className="mt-8">
          {/* Today's Schedule List */}
          <Col xs={24} lg={16}>
            <Card 
                title={<span className="flex items-center gap-2"><Clock size={18} className="text-blue-600"/> Today's Meal Plan</span>}
                extra={<Button type="link" onClick={() => setCurrentView('menu-schedule')}>Full Schedule</Button>}
                style={cardStyle}
                className="border-none"
            >
              {menusLoading ? <div className="text-center py-10"><Spin /></div> : (
                <List
                  dataSource={todayMenus}
                  locale={{ emptyText: <Empty description="No meals scheduled for today" /> }}
                  renderItem={item => (
                    <List.Item className="border-slate-100 px-2 hover:bg-slate-50 transition-colors rounded-xl mb-1">
                      <List.Item.Meta
                        avatar={
                          <div className="w-24 h-10 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: `${getMealColor(item.meal_time)}15`, color: getMealColor(item.meal_time) }}>
                            {item.meal_time.toUpperCase()}
                          </div>
                        }
                        title={<Text strong className="text-slate-800">{item.Menu?.name}</Text>}
                        description={<Text type="secondary" size="small">Est. Servings: {item.estimated_servings}</Text>}
                      />
                      <div className="text-right">
                        <Tag color="blue" bordered={false} className="m-0 font-semibold">₹{parseFloat(item.cost_per_serving || 0).toFixed(2)}</Tag>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase">Per Serving</div>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          
          {/* Upcoming Meal Card */}
          <Col xs={24} lg={8}>
            <Card 
                title={<span className="text-slate-800">Live: Next Meal</span>}
                style={{ ...cardStyle, background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)' }}
                className="border-none"
            >
              {!upcomingMenu ? <Empty description="Kitchen is closed" /> : (
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <Tag color="processing" className="px-3 rounded-full">{upcomingMenu.meal_time.toUpperCase()}</Tag>
                    <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> ACTIVE
                    </span>
                  </div>
                  
                  <Title level={3} style={{ margin: '8px 0' }}>{upcomingMenu.Menu?.name}</Title>
                  
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Scheduled Servings</span>
                        <Text strong>{upcomingMenu.estimated_servings}</Text>
                    </div>
                    <Divider className="m-0 border-blue-100" />
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Allocated Budget</span>
                        <Text strong className="text-blue-600">₹{parseFloat(upcomingMenu.total_cost || 0).toFixed(2)}</Text>
                    </div>
                  </div>

                  <Button type="primary" block size="large" onClick={() => setCurrentView('menus')} className="shadow-lg shadow-blue-100">
                    Menu Management
                  </Button>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Analytics Section */}
        <Row gutter={[24, 24]} className="mt-8">
          <Col xs={24} lg={12}>
            <Card title={<span className="flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> Monthly Expense Trends</span>} style={cardStyle} className="border-none">
              {chartsLoading ? <div className="py-20 text-center"><Spin /></div> : 
                monthlyExpensesData ? <Bar data={monthlyExpensesData} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : <Empty />
              }
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<span className="flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500"/> Stock Inventory Status</span>} style={cardStyle} className="border-none">
              {chartsLoading ? <div className="py-20 text-center"><Spin /></div> : 
                itemStockData ? <Bar data={itemStockData} options={{ indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }} /> : <Empty />
              }
            </Card>
          </Col>
        </Row>
        
        {/* Quick Actions Footer */}
        <div className="mt-12 mb-6">
            <Title level={5} className="mb-6 flex items-center gap-2">
              <PlusCircle size={20} className="text-slate-400"/>
              Quick Actions
            </Title>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Menu Planner', icon: <Calendar size={18}/>, id: 'menu-planner' },
                { label: 'Create Menu', icon: <PlusCircle size={18}/>, id: 'create-menu' },
                { label: 'Special Orders', icon: <ShoppingBag size={18}/>, id: 'food-orders-dashboard' },
                { label: 'Billing/Fees', icon: <CreditCard size={18}/>, id: 'mess-fee' },
                { label: 'Daily Rate', icon: <Calculator size={18}/>, id: 'daily-rate-report' },
              ].map(action => (
                <button 
                    key={action.id}
                    className="bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-all p-4 rounded-2xl flex flex-col items-center gap-3 shadow-sm group"
                    onClick={() => setCurrentView(action.id)}
                >
                    <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-white transition-colors">
                      {action.icon}
                    </div>
                    <span className="text-sm font-semibold">{action.label}</span>
                </button>
              ))}
            </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MessDashboard;