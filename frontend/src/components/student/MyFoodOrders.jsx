import React, { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Button, Space, Tag, Spin, Alert, Collapse, Descriptions, Typography, Timeline, Badge, Modal, message } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined, CloseOutlined } from '@ant-design/icons';
import { studentAPI } from '../../services/api'; // Corrected import
import moment from 'moment';

const { RangePicker } = DatePicker;
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

const MyFoodOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let params = {};
      if (dateRange) {
        params = {
          from_date: dateRange[0].format('YYYY-MM-DD'),
          to_date: dateRange[1].format('YYYY-MM-DD')
        };
      }
      
      const response = await studentAPI.getFoodOrders(params); // USE studentAPI
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

  const handleSearch = () => {
    fetchOrders();
  };

  const handleReset = () => {
    setDateRange(null);
    fetchOrders();
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setViewModalVisible(true);
  };

  const handleCancelOrder = async (id) => {
    Modal.confirm({
      title: 'Confirm Cancellation',
      content: 'Are you sure you want to cancel this order? This action cannot be undone.',
      okText: 'Yes, Cancel',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          const response = await studentAPI.cancelFoodOrder(id); // USE studentAPI
          if (response.data.success) {
            message.success('Order cancelled successfully');
            fetchOrders();
          } else {
            message.error('Failed to cancel order: ' + (response.data.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('Failed to cancel order:', error);
          message.error('Failed to cancel order. Please try again later.');
        }
      },
    });
  };

  const renderOrderStatus = (status) => {
    return <Tag color={orderStatusColors[status] || 'default'}>{status.toUpperCase()}</Tag>;
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <span>#{id}</span>
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
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewOrder(record)}
          >
            View
          </Button>
          
          {record.status === 'pending' && (
            <Button
              type="danger"
              icon={<CloseOutlined />}
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

  const renderOrderDetailModal = () => {
    if (!selectedOrder) return null;
    
    return (
      <Modal
        title={<div>Order #{selectedOrder.id} Details</div>}
        open={viewModalVisible} // Changed from `visible` to `open`
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Order Date" span={2}>
            {moment(selectedOrder.order_date).format('DD/MM/YYYY h:mm A')}
          </Descriptions.Item>
          <Descriptions.Item label="Requested Time" span={2}>
            {moment(selectedOrder.requested_time).format('DD/MM/YYYY h:mm A')}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {renderOrderStatus(selectedOrder.status)}
          </Descriptions.Item>
          <Descriptions.Item label="Payment Status">
            <Tag color={selectedOrder.payment_status === 'paid' ? 'green' : selectedOrder.payment_status === 'refunded' ? 'volcano' : 'gold'}>
              {selectedOrder.payment_status.toUpperCase()}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount" span={2}>
            ₹{parseFloat(selectedOrder.total_amount).toFixed(2)}
          </Descriptions.Item>
          {selectedOrder.notes && (
            <Descriptions.Item label="Notes" span={2}>
              {selectedOrder.notes}
            </Descriptions.Item>
          )}
        </Descriptions>
        
        <Collapse defaultActiveKey={['1']} style={{ marginTop: 16 }}>
          <Panel header="Order Items" key="1">
            <Table
              dataSource={selectedOrder.FoodOrderItems}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: 'Item',
                  dataIndex: ['SpecialFoodItem', 'name'],
                  key: 'item'
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
                }
              ]}
              expandable={{
                expandedRowRender: record => 
                  record.special_instructions ? (
                    <p style={{ margin: 0 }}>
                      <Text strong>Special Instructions:</Text> {record.special_instructions}
                    </p>
                  ) : null,
                rowExpandable: record => record.special_instructions,
              }}
            />
          </Panel>
          
          <Panel header="Order Timeline" key="2">
            <Timeline mode="left">
              <Timeline.Item color="green">
                Order Placed
                <p>{moment(selectedOrder.createdAt).format('DD/MM/YYYY h:mm A')}</p>
              </Timeline.Item>
              
              {selectedOrder.status !== 'pending' && (
                <Timeline.Item color="blue">
                  Order Confirmed
                  <p>{selectedOrder.status === 'pending' ? 'Pending' : moment(selectedOrder.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
                </Timeline.Item>
              )}
              
              {(selectedOrder.status === 'preparing' || selectedOrder.status === 'ready' || selectedOrder.status === 'delivered') && (
                <Timeline.Item color="purple">
                  Preparing
                  <p>{moment(selectedOrder.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
                </Timeline.Item>
              )}
              
              {(selectedOrder.status === 'ready' || selectedOrder.status === 'delivered') && (
                <Timeline.Item color="cyan">
                  Ready for Pickup
                  <p>{moment(selectedOrder.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
                </Timeline.Item>
              )}
              
              {selectedOrder.status === 'delivered' && (
                <Timeline.Item color="green">
                  Delivered
                  <p>{moment(selectedOrder.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
                </Timeline.Item>
              )}
              
              {selectedOrder.status === 'cancelled' && (
                <Timeline.Item color="red">
                  Cancelled
                  <p>{moment(selectedOrder.updatedAt).format('DD/MM/YYYY h:mm A')}</p>
                </Timeline.Item>
              )}
            </Timeline>
          </Panel>
        </Collapse>
      </Modal>
    );
  };

  return (
    <Card 
      title={<span>My Food Orders <Badge count={orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing' || o.status === 'ready').length} /></span>}
      variant="borderless" // Changed from `bordered={false}` to `variant="borderless"` for Ant Design v5
    >
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
            value={dateRange}
            onChange={setDateRange}
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
      
      <Spin spinning={loading}>
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          bordered
        />
      </Spin>
      
      {renderOrderDetailModal()}
    </Card>
  );
};

export default MyFoodOrders;
