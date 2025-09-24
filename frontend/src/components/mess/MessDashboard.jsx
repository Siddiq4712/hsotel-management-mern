import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, List, Table, Tag, Button, Calendar, Badge,
  Tabs, Typography, Space, Divider, Spin, Alert, Empty
} from 'antd';
import {
  AppstoreOutlined, FileTextOutlined, ScheduleOutlined, 
  UserOutlined, WarningOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CalendarOutlined, ForkOutlined, CoffeeOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;
const { Title, Text, Link } = Typography;

const MessDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayMenus, setTodayMenus] = useState([]);
  const [menusLoading, setMenusLoading] = useState(true);
  const [specialOrders, setSpecialOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchTodayMenus();
    fetchSpecialOrders();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await messAPI.getMessDashboardStats();
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayMenus = async () => {
    setMenusLoading(true);
    try {
      const today = moment().format('YYYY-MM-DD');
      const params = { start_date: today, end_date: today };
      const response = await messAPI.getMenuSchedule(params);
      setTodayMenus(response.data.data || []);
    } catch (error) {
      console.error('Error fetching today\'s menus:', error);
    } finally {
      setMenusLoading(false);
    }
  };

  const fetchSpecialOrders = async () => {
    setOrdersLoading(true);
    try {
      const today = moment().format('YYYY-MM-DD');
      const params = { 
        from_date: today, 
        to_date: today,
        status: 'pending,confirmed,preparing'
      };
      const response = await messAPI.getFoodOrders(params);
      setSpecialOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching special orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      confirmed: 'blue',
      preparing: 'purple',
      ready: 'green',
      delivered: 'green',
      cancelled: 'red'
    };
    return colors[status] || 'default';
  };

  const getNextMealTime = () => {
    const currentHour = moment().hour();
    
    if (currentHour < 9) return 'breakfast';
    if (currentHour < 14) return 'lunch';
    if (currentHour < 17) return 'snacks';
    if (currentHour < 22) return 'dinner';
    return 'breakfast'; // After 10pm, next meal is tomorrow's breakfast
  };

  const getMealColor = (mealType) => {
    const colors = {
      breakfast: 'blue',
      lunch: 'green',
      dinner: 'purple',
      snacks: 'orange'
    };
    return colors[mealType] || 'blue';
  };

  const getUpcomingMenu = () => {
    const nextMeal = getNextMealTime();
    return todayMenus.find(menu => menu.meal_time === nextMeal);
  };

  const upcomingMenu = getUpcomingMenu();

  return (
    <div>
      <Title level={2}>Mess Dashboard</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Menus"
              value={loading ? '-' : dashboardData?.totalMenus || 0}
              prefix={<AppstoreOutlined />}
              loading={loading}
            />
            <div style={{ marginTop: 8 }}>
              <Link href="/mess/menu-management">Manage Menus</Link>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Scheduled Meals Today"
              value={menusLoading ? '-' : todayMenus.length}
              prefix={<ScheduleOutlined />}
              loading={menusLoading}
            />
            <div style={{ marginTop: 8 }}>
              <Link href="/mess/menu-planner">Plan Menu</Link>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Special Orders Today"
              value={ordersLoading ? '-' : specialOrders.length}
              prefix={<FileTextOutlined />}
              loading={ordersLoading}
            />
            <div style={{ marginTop: 8 }}>
              <Link href="/mess/food-orders">Manage Orders</Link>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={loading ? '-' : dashboardData?.lowStockCount || 0}
              valueStyle={{ color: (dashboardData?.lowStockCount > 0) ? '#cf1322' : undefined }}
              prefix={<WarningOutlined />}
              loading={loading}
            />
            <div style={{ marginTop: 8 }}>
              <Link href="/mess/inventory">Check Inventory</Link>
            </div>
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Today's Schedule" extra={<Link href="/mess/menu-schedule">View All</Link>}>
            {menusLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin />
              </div>
            ) : todayMenus.length === 0 ? (
              <Empty description="No meals scheduled for today" />
            ) : (
              <List
                dataSource={todayMenus}
                renderItem={item => (
                  <List.Item
                    actions={[
                      item.status === 'scheduled' ? (
                        <Button 
                          size="small" 
                          type="primary" 
                          onClick={() => {
                            messAPI.updateMenuSchedule(item.id, { status: 'served' });
                            fetchTodayMenus();
                          }}
                        >
                          Mark as Served
                        </Button>
                      ) : (
                        <Tag color="green">Served</Tag>
                      )
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Tag color={getMealColor(item.meal_time)} style={{ fontSize: '14px', padding: '4px 8px' }}>
                          {item.meal_time.toUpperCase()}
                        </Tag>
                      }
                      title={item.Menu?.name || 'Unknown Menu'}
                      description={
                        <Space direction="vertical" size={0}>
                          <Text>Servings: {item.estimated_servings}</Text>
                          <Text type="secondary">Cost per serving: ₹{parseFloat(item.cost_per_serving || 0).toFixed(2)}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title="Upcoming Meal" extra={<CalendarOutlined />}>
            {menusLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin />
              </div>
            ) : !upcomingMenu ? (
              <Empty description="No upcoming meals scheduled" />
            ) : (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Tag color={getMealColor(upcomingMenu.meal_time)} style={{ fontSize: '14px', padding: '4px 8px' }}>
                    {upcomingMenu.meal_time.toUpperCase()}
                  </Tag>
                </div>
                
                <Title level={4}>{upcomingMenu.Menu?.name || 'Unknown Menu'}</Title>
                
                <div style={{ marginBottom: 16 }}>
                  <Text>Servings: {upcomingMenu.estimated_servings}</Text>
                  <br />
                  <Text>Total Cost: ₹{parseFloat(upcomingMenu.total_cost || 0).toFixed(2)}</Text>
                </div>
                
                <Divider style={{ margin: '12px 0' }} />
                
                <Title level={5}>Menu Items:</Title>
                {upcomingMenu.Menu?.tbl_Menu_Items?.length > 0 ? (
                  <List
                    size="small"
                    dataSource={upcomingMenu.Menu.tbl_Menu_Items}
                    renderItem={item => (
                      <List.Item>
                        <Text>{item.tbl_Item?.name}: {item.quantity} {item.unit}</Text>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">No items in this menu</Text>
                )}
                
                <div style={{ marginTop: 16 }}>
                  <Button 
                    type="primary" 
                    href={`/mess/menu-management?id=${upcomingMenu.Menu?.id}`}
                  >
                    View Full Menu
                  </Button>
                </div>
              </div>
            )}
          </Card>
          
          <Card title="Special Orders" style={{ marginTop: 16 }} extra={<Link href="/mess/food-orders">View All</Link>}>
            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin />
              </div>
            ) : specialOrders.length === 0 ? (
              <Empty description="No special orders for today" />
            ) : (
              <List
                dataSource={specialOrders.slice(0, 3)} // Only show first 3
                renderItem={order => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text>Order #{order.id}</Text>
                          <Tag color={getStatusColor(order.status)}>
                            {order.status.toUpperCase()}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Text>{order.Student?.username}</Text>
                          <Text type="secondary">
                            {moment(order.requested_time).format('HH:mm')} • 
                            ₹{parseFloat(order.total_amount).toFixed(2)}
                          </Text>
                        </Space>
                      }
                    />
                    <Button 
                      size="small"
                      onClick={() => navigate(`/mess/food-orders?id=${order.id}`)}
                    >
                      Details
                    </Button>
                  </List.Item>
                )}
                footer={
                  specialOrders.length > 3 ? (
                    <div style={{ textAlign: 'center' }}>
                      <Link href="/mess/food-orders">
                        {specialOrders.length - 3} more orders
                      </Link>
                    </div>
                  ) : null
                }
              />
            )}
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <Button type="primary" size="large" icon={<CoffeeOutlined />} onClick={() => navigate('/mess/menu-planner')}>
                Schedule Menu
              </Button>
              <Button size="large" icon={<ForkOutlined />} onClick={() => navigate('/mess/daily-operations')}>
                Record Consumption
              </Button>
              <Button size="large" icon={<WarningOutlined />} onClick={() => navigate('/mess/inventory')}>
                Update Inventory
              </Button>
              <Button size="large" icon={<FileTextOutlined />} onClick={() => navigate('/mess/food-orders')}>
                Manage Orders
              </Button>
              <Button size="large" icon={<AppstoreOutlined />} onClick={() => navigate('/mess/menu-management')}>
                Manage Menus
              </Button>
              <Button size="large" icon={<ScheduleOutlined />} onClick={() => navigate('/mess/reports/consumption')}>
                View Reports
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MessDashboard;
