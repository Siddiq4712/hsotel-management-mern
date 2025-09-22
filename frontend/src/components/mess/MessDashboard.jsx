import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, List, Tag, Divider, Spin, Button, Empty } from 'antd';
import { 
  ShoppingCartOutlined, 
  CoffeeOutlined, 
  WarningOutlined, 
  CheckOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import moment from 'moment';

const MessDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [todayMenus, setTodayMenus] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats
      const statsResponse = await api.get('/mess/dashboard-stats');
      setStats(statsResponse.data.data);

      // Fetch today's menus
      const today = moment().format('YYYY-MM-DD');
      const menusResponse = await api.get(`/mess/menu-schedule?date=${today}`);
      setTodayMenus(menusResponse.data.data);

      // Fetch low stock items
      const stockResponse = await api.get('/mess/stock?low_stock=true');
      setLowStockItems(stockResponse.data.data);

      // Fetch recent expenses
      const expensesResponse = await api.get('/mess/expenses');
      setRecentExpenses(expensesResponse.data.data.slice(0, 5));

      // Fetch pending orders
      const ordersResponse = await api.get('/mess/purchase-orders?status=draft,sent,confirmed');
      setPendingOrders(ordersResponse.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Menus"
              value={stats?.totalMenus || 0}
              prefix={<CoffeeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Low Stock Items"
              value={stats?.lowStockCount || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: stats?.lowStockCount > 0 ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending Orders"
              value={stats?.pendingOrders || 0}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Monthly Expenses"
              value={stats?.monthlyExpenses || 0}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="₹"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Today's Menu" extra={<CalendarOutlined />}>
            {todayMenus.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={todayMenus}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <div>
                          <Tag color={
                            item.meal_time === 'breakfast' ? 'blue' :
                            item.meal_time === 'lunch' ? 'green' :
                            item.meal_time === 'dinner' ? 'purple' : 'orange'
                          }>
                            {item.meal_time.charAt(0).toUpperCase() + item.meal_time.slice(1)}
                          </Tag>
                          <span style={{ marginLeft: 8 }}>{item.Menu?.name || 'Unknown Menu'}</span>
                        </div>
                      }
                      description={
                        item.Menu?.tbl_Menu_Items && item.Menu.tbl_Menu_Items.length > 0 ? 
                        item.Menu.tbl_Menu_Items.map(menuItem => 
                          menuItem.tbl_Item?.name
                        ).join(', ') : 
                        'No items in this menu'
                      }
                    />
                    <div>
                      <Tag color={
                        item.status === 'scheduled' ? 'blue' :
                        item.status === 'served' ? 'green' : 'red'
                      }>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Tag>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No menus scheduled for today" />
            )}
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="Low Stock Items" extra={<WarningOutlined style={{ color: '#cf1322' }} />}>
            {lowStockItems.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={lowStockItems}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.Item?.name}
                      description={`Category: ${item.Item?.tbl_ItemCategory?.name || 'N/A'}`}
                    />

                    <div>
                      <div style={{ color: '#cf1322' }}>
                        {item.current_stock} / {item.minimum_stock} {item.Item.UOM?.abbreviation || 'units'}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No low stock items" />
            )}
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <Button type="primary" href="#/stock">Manage Stock</Button>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Recent Expenses" extra={<FileTextOutlined />}>
            {recentExpenses.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={recentExpenses}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.ExpenseType?.name || 'Other Expense'}
                      description={`Date: ${moment(item.expense_date).format('DD MMM YYYY')}`}
                    />
                    <div>₹{parseFloat(item.amount).toFixed(2)}</div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No recent expenses" />
            )}
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <Button type="primary" href="#/daily-operations">Record Expense</Button>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="Pending Orders" extra={<ClockCircleOutlined />}>
            {pendingOrders.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={pendingOrders}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={`Order #${item.id}`}
                      description={`Supplier: ${item.Supplier?.name || 'Unknown'}`}
                    />
                    <div>
                      <div>₹{parseFloat(item.total_amount).toFixed(2)}</div>
                      <Tag color={
                        item.status === 'draft' ? 'default' :
                        item.status === 'sent' ? 'blue' :
                        item.status === 'confirmed' ? 'green' : 'red'
                      }>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Tag>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No pending orders" />
            )}
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <Button type="primary" href="#/purchase-orders">Manage Orders</Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MessDashboard;
