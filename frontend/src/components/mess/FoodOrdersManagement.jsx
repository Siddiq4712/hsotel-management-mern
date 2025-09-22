// src/components/mess/FoodOrdersManagement.jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Select, DatePicker, Button, Space, Tag, Spin, Alert, message, Tabs, Badge, Collapse, Descriptions, Typography, Timeline } from 'antd';
import { SearchOutlined, ReloadOutlined, CheckOutlined, CloseOutlined, ClockCircleOutlined, DeliveredProcedureOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Text } = Typography;

const orderStatusColors = {
  pending: 'gold',
  confirmed: 'blue',
  preparing: 'purple',
  ready: 'cyan',
  delivered: 'green',
  cancelled: 'red'
};

const FoodOrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Filter states
  const [filters, setFilters] = useState({
    status: 'pending',
    dateRange: null
  });

  useEffect(() => {
    fetchOrders();
  }, [filters.status]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        status: filters.status,
        ...(filters.dateRange && { 
          from_date: filters.dateRange[0].format('YYYY-MM-DD'),
          to_date: filters.dateRange[1].format('YYYY-MM-DD')
        })
      };
      
      const response = await messAPI.getFoodOrders(params);
      if (response.data.success) {
        setOrders(response.data.data);
      } else {
        setError('Failed to load orders: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Failed to load orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setFilters(prev => ({ ...prev, status: key === 'all' ? undefined : key }));
  };

  const handleDateRangeChange = (dateRange) => {
    setFilters(prev => ({ ...prev, dateRange }));
  };

  const handleSearch = () => {
    fetchOrders();
  };

  const handleReset = () => {
    setFilters({
      status: activeTab === 'all' ? undefined : activeTab,
      dateRange: null
    });
    fetchOrders();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await messAPI.updateFoodOrderStatus(orderId, newStatus);
      if (response.data.success) {
        message.success(`Order status updated to ${newStatus}`);
        fetchOrders();
      } else {
        message.error('Failed to update order status: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      message.error('Failed to update order status. Please try again later.');
    }
  };

  const updatePaymentStatus = async (orderId, newStatus) => {
    try {
      const response = await messAPI.updatePaymentStatus(orderId, newStatus);
      if (response.data.success) {
        message.success(`Payment status updated to ${newStatus}`);
        fetchOrders();
      } else {
        message.error('Failed to update payment status: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to update payment status:', error);
      message.error('Failed to update payment status. Please try again later.');
    }
  };

  const renderOrderStatus = (status) => {
    return <Tag color={orderStatusColors[status] || 'default'}>{status.toUpperCase()}</Tag>;
  };

  const renderOrderActions = (order) => {
    const { id, status, payment_status } = order;
    
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Status Actions */}
        <Space>
          {status === 'pending' && (
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckOutlined />}
              onClick={() => updateOrderStatus(id, 'confirmed')}
            >
              Confirm
            </Button>
          )}
          
          {status === 'confirmed' && (
            <Button 
              type="primary" 
              size="small" 
              icon={<ClockCircleOutlined />}
              onClick={() => updateOrderStatus(id, 'preparing')}
            >
              Preparing
            </Button>
          )}
          
          {status === 'preparing' && (
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckOutlined />}
              onClick={() => updateOrderStatus(id, 'ready')}
            >
              Ready
            </Button>
          )}
          
          {status === 'ready' && (
            <Button 
              type="primary" 
              size="small" 
              icon={<DeliveredProcedureOutlined />}
              onClick={() => updateOrderStatus(id, 'delivered')}
            >
              Delivered
            </Button>
          )}
          
          {(status === 'pending' || status === 'confirmed') && (
            <Button 
              type="danger" 
              size="small" 
              icon={<CloseOutlined />}
              onClick={() => updateOrderStatus(id, 'cancelled')}
            >
              Cancel
            </Button>
          )}
        </Space>
        
        {/* Payment Actions */}
        <Space>
          {payment_status === 'pending' && (
            <Button 
              type="default" 
              size="small" 
              icon={<DollarCircleOutlined />}
              onClick={() => updatePaymentStatus(id, 'paid')}
            >
              Mark as Paid
            </Button>
          )}
        </Space>
      </Space>
    );
  };

  const renderOrderItems = (items) => {
    return (
      <ul style={{ paddingLeft: 16, margin: 0 }}>
        {items.map((item, index) => (
          <li key={index}>
            {item.SpecialFoodItem.name} x {item.quantity} - ₹{parseFloat(item.subtotal).toFixed(2)}
            {item.special_instructions && (
              <div>
                <Text type="secondary" italic>Note: {item.special_instructions}</Text>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <span>#{id}</span>
    },
    {
      title: 'Student',
      dataIndex: ['Student', 'username'],
      key: 'student'
    },
    {
      title: 'Order Date',
      dataIndex: 'order_date',
      key: 'order_date',
      render: (date) => moment(date).format('DD/MM/YYYY h:mm A')
    },
    {
      title: 'Requested Time',
      dataIndex: 'requested_time',
      key: 'requested_time',
      render: (time) => moment(time).format('DD/MM/YYYY h:mm A')
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: renderOrderStatus
    },
    {
      title: 'Payment',
      dataIndex: 'payment_status',
      key: 'payment',
      render: (status) => (
        <Tag color={status === 'paid' ? 'green' : status === 'refunded' ? 'volcano' : 'gold'}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'amount',
      render: (amount) => `₹${parseFloat(amount).toFixed(2)}`
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => renderOrderActions(record)
    }
  ];

  const expandedRowRender = (record) => {
    return (
      <div style={{ padding: 16 }}>
        <Collapse defaultActiveKey={['1']}>
          <Panel header="Order Details" key="1">
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Order ID">#{record.id}</Descriptions.Item>
              <Descriptions.Item label="Student">{record.Student.username}</Descriptions.Item>
              <Descriptions.Item label="Email">{record.Student.email}</Descriptions.Item>
              <Descriptions.Item label="Order Date">{moment(record.order_date).format('DD/MM/YYYY h:mm A')}</Descriptions.Item>
              <Descriptions.Item label="Requested Time">{moment(record.requested_time).format('DD/MM/YYYY h:mm A')}</Descriptions.Item>
              <Descriptions.Item label="Total Amount">₹{parseFloat(record.total_amount).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Status">{renderOrderStatus(record.status)}</Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag color={record.payment_status === 'paid' ? 'green' : record.payment_status === 'refunded' ? 'volcano' : 'gold'}>
                  {record.payment_status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              {record.notes && (
                <Descriptions.Item label="Notes" span={2}>{record.notes}</Descriptions.Item>
              )}
            </Descriptions>
          </Panel>
          
          <Panel header="Order Items" key="2">
            <Table
              dataSource={record.FoodOrderItems}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Item',
                  dataIndex: ['SpecialFoodItem', 'name'],
                  key: 'item'
                },
                {
                  title: 'Category',
                  dataIndex: ['SpecialFoodItem', 'category'],
                  key: 'category'
                },
                {
                  title: 'Unit Price',
                  dataIndex: 'unit_price',
                  key: 'unit_price',
                  render: (price) => `₹${parseFloat(price).toFixed(2)}`
                },
                {
                  title: 'Quantity',
                  dataIndex: 'quantity',
                  key: 'quantity'
                },
                {
                  title: 'Subtotal',
                  dataIndex: 'subtotal',
                  key: 'subtotal',
                  render: (price) => `₹${parseFloat(price).toFixed(2)}`
                },
                {
                  title: 'Instructions',
                  dataIndex: 'special_instructions',
                  key: 'instructions',
                  ellipsis: true
                }
              ]}
            />
          </Panel>
          
          <Panel header="Order Timeline" key="3">
            <Timeline mode="left">
              <Timeline.Item color="green">
                Order Placed
                <p>{moment(record.createdAt).format('DD/MM/YYYY h:mm A')}</p>
              </Timeline.Item>
              
              {record.status !== 'pending' && (
                <Timeline.Item color="blue">
                  Order Confirmed
                  <p>{record.status === 'pending' ? 'Pending' : moment(record.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
                </Timeline.Item>
              )}
              
              {(record.status === 'preparing' || record.status === 'ready' || record.status === 'delivered') && (
                <Timeline.Item color="purple">
                  Preparing
                  <p>{moment(record.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
                </Timeline.Item>
              )}
              
              {(record.status === 'ready' || record.status === 'delivered') && (
                <Timeline.Item color="cyan">
                  Ready for Pickup
                  <p>{moment(record.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
                </Timeline.Item>
              )}
              
              {record.status === 'delivered' && (
                <Timeline.Item color="green">
                  Delivered
                  <p>{moment(record.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
                </Timeline.Item>
              )}
              
              {record.status === 'cancelled' && (
                <Timeline.Item color="red">
                  Cancelled
                  <p>{moment(record.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
                </Timeline.Item>
              )}
            </Timeline>
          </Panel>
        </Collapse>
      </div>
    );
  };

  return (
    <Card title="Food Orders Management" bordered={false}>
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          onClose={() => setError(null)}
        />
      )}
      
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <RangePicker
            value={filters.dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
          />
          
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
          >
            Search
          </Button>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
          >
            Reset
          </Button>
        </Space>
      </div>
      
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane 
          tab={
            <Badge count={orders.filter(o => o.status === 'pending').length} offset={[15, 0]}>
              Pending
            </Badge>
          } 
          key="pending"
        />
        <TabPane 
          tab={
            <Badge count={orders.filter(o => o.status === 'confirmed').length} offset={[15, 0]}>
              Confirmed
            </Badge>
          }
          key="confirmed"
        />
        <TabPane 
          tab={
            <Badge count={orders.filter(o => o.status === 'preparing').length} offset={[15, 0]}>
              Preparing
            </Badge>
          }
          key="preparing"
        />
        <TabPane 
          tab={
            <Badge count={orders.filter(o => o.status === 'ready').length} offset={[15, 0]}>
              Ready
            </Badge>
          }
          key="ready"
        />
        <TabPane tab="Delivered" key="delivered" />
        <TabPane tab="Cancelled" key="cancelled" />
        <TabPane tab="All Orders" key="all" />
      </Tabs>
      
      <Spin spinning={loading}>
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender
          }}
          bordered
        />
      </Spin>
    </Card>
  );
};

export default FoodOrdersManagement;
