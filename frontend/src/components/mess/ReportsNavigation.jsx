import React from 'react';
import { Card, Row, Col, Button, Typography } from 'antd';
import {
  BarChartOutlined, LineChartOutlined, PieChartOutlined,
  FileTextOutlined, CalendarOutlined, ShoppingOutlined,
  DollarOutlined, AppstoreOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

const reportItems = [
  {
    title: 'Consumption Report',
    description: 'View item consumption summary with costs',
    icon: <BarChartOutlined style={{ fontSize: 24 }} />,
    path: '/mess/reports/consumption',
    color: '#1890ff'
  },
  {
    title: 'Menu Planning Report',
    description: 'Analyze scheduled menus and their costs',
    icon: <CalendarOutlined style={{ fontSize: 24 }} />,
    path: '/mess/reports/menu-planning',
    color: '#52c41a'
  },
  {
    title: 'Inventory Report',
    description: 'Current stock levels and low stock alerts',
    icon: <ShoppingOutlined style={{ fontSize: 24 }} />,
    path: '/mess/reports/inventory',
    color: '#722ed1'
  },
  {
    title: 'Special Food Orders Report',
    description: 'Summary of special food orders',
    icon: <FileTextOutlined style={{ fontSize: 24 }} />,
    path: '/mess/reports/special-orders',
    color: '#fa8c16'
  }
];

const ReportsNavigation = () => {
  return (
    <div>
      <Title level={2}>Mess Reports</Title>
      <Text>Select a report to view detailed analytics and information</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {reportItems.map((report, index) => (
          <Col xs={24} sm={12} md={8} lg={6} key={index}>
            <Card
              hoverable
              style={{ height: '100%' }}
              bodyStyle={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%'
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <div 
                  style={{ 
                    color: report.color, 
                    fontSize: 40, 
                    textAlign: 'center',
                    marginBottom: 16
                  }}
                >
                  {report.icon}
                </div>
                <Title level={4} style={{ textAlign: 'center' }}>{report.title}</Title>
                <Text type="secondary">{report.description}</Text>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: 'auto' }}>
                <Link to={report.path}>
                  <Button type="primary" style={{ backgroundColor: report.color, borderColor: report.color }}>
                    View Report
                  </Button>
                </Link>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginTop: 24 }}>
        <Title level={3}>Need Help With Reports?</Title>
        <Text>
          These reports are designed to help you monitor your mess operations and make informed decisions.
          Each report provides different insights:
        </Text>
        
        <ul style={{ marginTop: 16 }}>
          <li>
            <Text strong>Consumption Report</Text> - Track what items are being consumed and their associated costs
          </li>
          <li>
            <Text strong>Menu Planning Report</Text> - Analyze your menu scheduling and cost efficiency
          </li>
          <li>
            <Text strong>Inventory Report</Text> - Monitor stock levels to prevent shortages
          </li>
          <li>
            <Text strong>Special Food Orders Report</Text> - View special food ordering trends and revenue
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default ReportsNavigation;
