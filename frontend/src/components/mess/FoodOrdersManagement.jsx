import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Badge, Tag, Space, Button, message, 
  Drawer, Descriptions, Tabs, List, Avatar, Typography,
  Select, DatePicker, Form, Radio, Divider
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  EditOutlined, EyeOutlined, SearchOutlined, DollarOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

const FoodOrdersManagement = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState([
    moment().startOf('day'),
    moment().endOf('day')
  ]);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [paymentUpdateLoading, setPaymentUpdateLoading] = useState(false);

  const statusColors = {
    pending: 'orange',
    confirmed: 'blue',
    preparing: 'purple',
    ready: 'green',
    delivered: 'green',
    cancelled: 'red'
  };

  const paymentStatusColors = {
    pending: 'orange',
    paid: 'green',
    refunded: 'red'
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (dateRange && dateRange.length === 2) {
        params.from_date = dateRange[0].format('YYYY-MM-DD');
        params.to_date = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await messAPI.getFoodOrders(params);
      setOrders(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId) => {
    try {
      const response = await messAPI.getFoodOrderById(orderId);
      setCurrentOrder(response.data.data);
      setDrawerVisible(true);
    } catch (error) {
      message.error('Failed to fetch order details');
    }
  };

  const handleStatusChange = async (orderId, status) => {
    setStatusUpdateLoading(true);
    try {
      await messAPI.updateFoodOrderStatus(orderId, status);
      message.success(`Order status updated to ${status}`);
      
      if (currentOrder && currentOrder.id === orderId) {
        const response = await messAPI.getFoodOrderById(orderId);
        setCurrentOrder(response.data.data);
      }
      
      fetchOrders();
    } catch (error) {
      message.error('Failed to update order status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handlePaymentStatusChange = async (orderId, paymentStatus) => {
    setPaymentUpdateLoading(true);
    try {
      await messAPI.updatePaymentStatus(orderId, paymentStatus);
      message.success(`Payment status updated to ${paymentStatus}`);
      
      if (currentOrder && currentOrder.id === orderId) {
        const response = await messAPI.getFoodOrderById(orderId);
        setCurrentOrder(response.data.data);
      }
      
      fetchOrders();
    } catch (error) {
      message.error('Failed to update payment status');
    } finally {
      setPaymentUpdateLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await messAPI.cancelFoodOrder(orderId);
      message.success('Order cancelled successfully');
      
      if (currentOrder && currentOrder.id === orderId) {
        const response = await messAPI.getFoodOrderById(orderId);
        setCurrentOrder(response.data.data);
      }
      
      fetchOrders();
    } catch (error) {
      message.error('Failed to cancel order');
    }
  };

  const handleFilterChange = () => {
    fetchOrders();
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      render: id => `#${id}`
    },
    {
      title: 'Student',
      dataIndex: ['Student', 'username'],
      key: 'student',
      render: (text, record) => record.Student?.username || 'Unknown'
    },
    {
      title: 'Order Date',
      dataIndex: 'order_date',
      key: 'order_date',
      render: date => moment(date).format('DD MMM YYYY, HH:mm'),
      sorter: (a, b) => moment(a.order_date).unix() - moment(b.order_date).unix()
    },
    {
      title: 'Requested Time',
      dataIndex: 'requested_time',
      key: 'requested_time',
      render: time => moment(time).format('DD MMM YYYY, HH:mm'),
      sorter: (a, b) => moment(a.requested_time).unix() - moment(b.requested_time).unix()
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={statusColors[status] || 'default'}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Confirmed', value: 'confirmed' },
        { text: 'Preparing', value: 'preparing' },
        { text: 'Ready', value: 'ready' },
        { text: 'Delivered', value: 'delivered' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Payment',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: status => (
        <Tag color={paymentStatusColors[status] || 'default'}>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Paid', value: 'paid' },
        { text: 'Refunded', value: 'refunded' },
      ],
      onFilter: (value, record) => record.payment_status === value,
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: amount => `₹${parseFloat(amount).toFixed(2)}`,
      sorter: (a, b) => a.total_amount - b.total_amount
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => handleViewOrder(record.id)}
            size="small"
          />
          {record.status !== 'cancelled' && record.status !== 'delivered' && (
            <Button 
              danger 
              size="small"
              onClick={() => handleCancelOrder(record.id)}
            >
              Cancel
            </Button>
          )}
        </Space>
      )
    }
  ];

  const renderOrderItems = (items) => {
    return (
      <List
        itemLayout="horizontal"
        dataSource={items}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar shape="square" size="large" src={item.SpecialFoodItem?.image_url} />}
              title={<Text>{item.SpecialFoodItem?.name} × {item.quantity}</Text>}
              description={
                <Space direction="vertical" size={0}>
                  <Text type="secondary">
                    Unit: ₹{parseFloat(item.unit_price).toFixed(2)}
                  </Text>
                  <Text>Subtotal: ₹{parseFloat(item.subtotal).toFixed(2)}</Text>
                  {item.special_instructions && (
                    <Text type="secondary">Note: {item.special_instructions}</Text>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <Card
      title="Special Food Orders Management"
      extra={
        <Button type="primary" icon={<SearchOutlined />} onClick={fetchOrders}>
          Refresh
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Filter by status"
          style={{ width: 150 }}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setTimeout(handleFilterChange, 0);
          }}
        >
          <Option value="all">All Status</Option>
          <Option value="pending">Pending</Option>
          <Option value="confirmed">Confirmed</Option>
          <Option value="preparing">Preparing</Option>
          <Option value="ready">Ready</Option>
          <Option value="delivered">Delivered</Option>
          <Option value="cancelled">Cancelled</Option>
        </Select>

        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            setDateRange(dates);
            setTimeout(handleFilterChange, 0);
          }}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={orders}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
      />

      <Drawer
        title={`Order Details #${currentOrder?.id}`}
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        extra={
          currentOrder && currentOrder.status !== 'cancelled' && currentOrder.status !== 'delivered' ? (
            <Button danger onClick={() => handleCancelOrder(currentOrder.id)}>
              Cancel Order
            </Button>
          ) : null
        }
      >
        {currentOrder && (
          <>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Student">
                {currentOrder.Student?.username}
              </Descriptions.Item>
              <Descriptions.Item label="Order Date">
                {moment(currentOrder.order_date).format('DD MMM YYYY, HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Requested Time">
                {moment(currentOrder.requested_time).format('DD MMM YYYY, HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[currentOrder.status]}>
                  {currentOrder.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag color={paymentStatusColors[currentOrder.payment_status]}>
                  {currentOrder.payment_status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                ₹{parseFloat(currentOrder.total_amount).toFixed(2)}
              </Descriptions.Item>
              {currentOrder.notes && (
                <Descriptions.Item label="Notes">
                  {currentOrder.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left">Items</Divider>
            {renderOrderItems(currentOrder.FoodOrderItems || [])}
            
            <Divider orientation="left">Update Order</Divider>
            
            <Form layout="vertical">
              <Form.Item label="Update Status">
                <Radio.Group
                  buttonStyle="solid"
                  value={currentOrder.status}
                  onChange={(e) => handleStatusChange(currentOrder.id, e.target.value)}
                  disabled={currentOrder.status === 'cancelled' || currentOrder.status === 'delivered' || statusUpdateLoading}
                >
                  <Space wrap>
                    <Radio.Button value="pending">Pending</Radio.Button>
                    <Radio.Button value="confirmed">Confirm</Radio.Button>
                    <Radio.Button value="preparing">Preparing</Radio.Button>
                    <Radio.Button value="ready">Ready</Radio.Button>
                    <Radio.Button value="delivered">Delivered</Radio.Button>
                  </Space>
                </Radio.Group>
              </Form.Item>
              
              <Form.Item label="Update Payment">
                <Radio.Group
                  buttonStyle="solid"
                  value={currentOrder.payment_status}
                  onChange={(e) => handlePaymentStatusChange(currentOrder.id, e.target.value)}
                  disabled={paymentUpdateLoading}
                >
                  <Space wrap>
                    <Radio.Button value="pending">Pending</Radio.Button>
                    <Radio.Button value="paid">Paid</Radio.Button>
                    {currentOrder.payment_status === 'paid' && (
                      <Radio.Button value="refunded">Refund</Radio.Button>
                    )}
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Form>
          </>
        )}
      </Drawer>
    </Card>
  );
};

export default FoodOrdersManagement;
