import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Button, message, Spin, Typography, Modal, List, Avatar, Space,Card } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { messAPI } from '../../services/api'; // Make sure this path is correct
import moment from 'moment';

const { Title, Text } = Typography;

const MessOrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // To show loading on a specific button

  // 1. Create a reusable function to fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await messAPI.getFoodOrders({ status: 'pending' }); // Fetch only pending orders initially
      setOrders(response.data.data);
    } catch (error) {
      message.error("Failed to fetch orders.");
      console.error("Fetch Orders Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch orders on component mount and set up auto-refresh
  useEffect(() => {
    fetchOrders();
    const intervalId = setInterval(fetchOrders, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchOrders]);

  // 3. Logic to approve an order
  const handleApproveOrder = async (orderId) => {
    setActionLoading(orderId);
    try {
      // The API updates the status from 'pending' to 'confirmed'
      await messAPI.updateFoodOrderStatus(orderId, { status: 'confirmed' });
      message.success(`Order #${orderId} has been approved.`);
      fetchOrders(); // Refresh the list to remove the approved order
    } catch (error) {
      message.error("Failed to approve order.");
      console.error("Approve Order Error:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Student Name',
      dataIndex: ['Student', 'username'], // Access nested data
      key: 'student',
    },
    {
      title: 'Order Time',
      dataIndex: 'order_date',
      key: 'order_date',
      render: (text) => moment(text).format('MMM D, h:mm A'),
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => (
        <List
          size="small"
          dataSource={record.FoodOrderItems}
          renderItem={item => (
            <List.Item>
                <Text>{item.SpecialFoodItem.name} - </Text>
                <Text strong>Qty: {item.quantity}</Text>
            </List.Item>
          )}
        />
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `₹${parseFloat(amount).toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color="orange">{status.toUpperCase()}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<CheckOutlined />}
          loading={actionLoading === record.id}
          onClick={() => handleApproveOrder(record.id)}
          disabled={record.status !== 'pending'}
        >
          Approve
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <Title level={3}>New Food Orders</Title>
      <Table
        dataSource={orders}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
};

export default MessOrderDashboard;
