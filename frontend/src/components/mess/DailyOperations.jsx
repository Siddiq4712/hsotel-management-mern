import React, { useState, useEffect } from 'react';
import { Card, Tabs, Button, message, Row, Col, Statistic, Typography, List, Timeline } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, CoffeeOutlined, ScheduleOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';
import DailyConsumptionForm from './DailyConsumptionForm';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

const DailyOperations = () => {
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    scheduledMenus: 0,
    scheduledToday: 0,
    pendingOrders: 0,
    lowStockItems: 0
  });

  useEffect(() => {
    fetchDashboardData();
    fetchTodaysSchedule();
  }, []);

  const fetchDashboardData = async () => {
    setStatsLoading(true);
    try {
      const response = await messAPI.getMessDashboardStats();
      setDashboardData(response.data.data);
    } catch (error) {
      message.error('Failed to fetch dashboard data');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchTodaysSchedule = async () => {
    setLoading(true);
    try {
      const today = moment().format('YYYY-MM-DD');
      const params = { 
        start_date: today, 
        end_date: today 
      };
      const response = await messAPI.getMenuSchedule(params);
      setTodaysSchedule(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch today\'s schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
    fetchTodaysSchedule();
  };

  const renderMealTimeline = () => {
    if (todaysSchedule.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Text type="secondary">No meals scheduled for today</Text>
        </div>
      );
    }

    // Sort by meal time
    const mealOrder = { breakfast: 1, lunch: 2, snacks: 3, dinner: 4 };
    const sortedSchedule = [...todaysSchedule].sort((a, b) => mealOrder[a.meal_time] - mealOrder[b.meal_time]);

    return (
      <Timeline mode="left">
        {sortedSchedule.map(schedule => {
          const menu = schedule.Menu;
          const isPast = schedule.status === 'served';
          const isCurrentMeal = moment().hour() >= getMealHour(schedule.meal_time) && 
                              moment().hour() < getMealHour(schedule.meal_time) + 3;
                              
          return (
            <Timeline.Item 
              key={schedule.id} 
              color={isPast ? 'green' : isCurrentMeal ? 'blue' : 'gray'}
              label={getMealTimeLabel(schedule.meal_time)}
            >
              <div>
                <Text strong>{menu?.name || 'Unknown Menu'}</Text>
                <div>
                  <Text type="secondary">
                    {schedule.estimated_servings} servings | Cost: ₹{parseFloat(schedule.cost_per_serving || 0).toFixed(2)}/serving
                  </Text>
                </div>
                {isCurrentMeal && !isPast && (
                  <Button 
                    size="small" 
                    type="primary" 
                    style={{ marginTop: 8 }}
                    icon={<CheckCircleOutlined />}
                    onClick={() => markAsServed(schedule.id)}
                  >
                    Mark as Served
                  </Button>
                )}
              </div>
            </Timeline.Item>
          );
        })}
      </Timeline>
    );
  };

  const markAsServed = async (scheduleId) => {
    try {
      await messAPI.updateMenuSchedule(scheduleId, { status: 'served' });
      message.success('Menu marked as served');
      fetchTodaysSchedule();
    } catch (error) {
      message.error('Failed to update menu status');
    }
  };

  const getMealTimeLabel = (mealType) => {
    const times = {
      breakfast: '07:00 - 09:00',
      lunch: '12:00 - 14:00',
      snacks: '16:00 - 17:00',
      dinner: '19:00 - 21:00'
    };
    return times[mealType] || mealType;
  };

  const getMealHour = (mealType) => {
    const hours = {
      breakfast: 7,
      lunch: 12,
      snacks: 16,
      dinner: 19
    };
    return hours[mealType] || 0;
  };

  return (
    <Card title="Daily Mess Operations" extra={<Button onClick={handleRefresh}>Refresh</Button>}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Statistic 
            loading={statsLoading}
            title="Scheduled Menus"
            value={dashboardData.totalMenus}
            prefix={<ScheduleOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Statistic 
            loading={statsLoading}
            title="Today's Meals"
            value={todaysSchedule.length}
            prefix={<CoffeeOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Statistic 
            loading={statsLoading}
            title="Special Orders"
            value={dashboardData.pendingOrders || 0}
            prefix={<FileTextOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Statistic 
            loading={statsLoading}
            title="Low Stock Items"
            value={dashboardData.lowStockCount || 0}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: dashboardData.lowStockCount > 0 ? '#cf1322' : '' }}
          />
        </Col>
      </Row>

      <Tabs defaultActiveKey="1" style={{ marginTop: 16 }}>
        <TabPane tab="Today's Schedule" key="1">
          <Title level={4}>Today's Meal Schedule ({moment().format('dddd, MMMM Do')})</Title>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>Loading...</div>
          ) : (
            renderMealTimeline()
          )}
        </TabPane>
        <TabPane tab="Record Consumption" key="2">
          <DailyConsumptionForm onSuccess={handleRefresh} />
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default DailyOperations;
