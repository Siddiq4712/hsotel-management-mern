import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Table, Tag, Button, message, Typography, Card, 
  List, Space, ConfigProvider, theme, Skeleton, Badge, Tooltip, Switch 
} from 'antd';
import { 
  CheckCircle, Clock, Utensils, User, ReceiptText, 
  RefreshCw, ShoppingBag, Group, ListFilter, ChefHat
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;

const OrderSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton.Input active style={{ width: 200 }} />
        <Skeleton.Button active style={{ width: 100 }} />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="circle" size="large" />
          <div className="flex-1">
            <Skeleton active title={{ width: '30%' }} paragraph={{ rows: 1, width: '60%' }} />
          </div>
          <Skeleton.Button active style={{ width: 120 }} />
        </div>
      ))}
    </div>
  </Card>
);

const MessOrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [viewMode, setViewMode] = useState('orders'); // 'orders' or 'consolidated'

  const fetchOrders = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setLoading(true);
    try {
      const response = await messAPI.getFoodOrders({ status: 'pending' });
      setOrders(response.data.data || []);
    } catch (error) {
      message.error("Failed to sync orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const intervalId = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  // --- Logic for Grouped/Consolidated Items ---
  const consolidatedItems = useMemo(() => {
    const counts = {};
    orders.forEach(order => {
      order.FoodOrderItems?.forEach(item => {
        const itemName = item.SpecialFoodItem?.name || "Unknown Item";
        if (!counts[itemName]) {
          counts[itemName] = { quantity: 0, orderCount: 0 };
        }
        counts[itemName].quantity += item.quantity;
        counts[itemName].orderCount += 1;
      });
    });
    return Object.entries(counts).map(([name, data]) => ({
      name,
      ...data,
      key: name
    }));
  }, [orders]);

  const handleApproveOrder = async (orderId) => {
    setActionLoading(orderId);
    try {
      await messAPI.updateFoodOrderStatus(orderId, { status: 'confirmed' });
      message.success(`Order #${orderId} approved.`);
      fetchOrders(true);
    } catch (error) {
      message.error("Failed to approve order.");
    } finally {
      setActionLoading(null);
    }
  };

  const orderColumns = [
    {
      title: 'Order ID',
      key: 'order_info',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <div className="flex items-center gap-2">
            <Text strong className="text-slate-700">#{r.id}</Text>
            <Badge status="processing" />
          </div>
          <Text className="text-[11px] text-slate-400">{moment(r.order_date).format('h:mm A')}</Text>
        </Space>
      ),
    },
    {
      title: 'Student',
      dataIndex: ['Student', 'username'],
      key: 'student',
      render: (name) => (
        <Space>
          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[10px] border border-blue-100">
            {name?.charAt(0).toUpperCase()}
          </div>
          <Text className="text-sm">{name}</Text>
        </Space>
      )
    },
    {
      title: 'Ordered Items',
      key: 'items',
      render: (_, record) => (
        <div className="flex flex-wrap gap-2">
          {record.FoodOrderItems?.map((item, idx) => (
            <Tag key={idx} className="m-0 rounded-lg bg-slate-50 border-slate-200 text-slate-600 px-3">
              <Text strong className="text-blue-600 mr-1">{item.quantity}x</Text> {item.SpecialFoodItem?.name}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Total Bill',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      render: (amount) => <Text strong className="text-slate-700">₹{parseFloat(amount).toFixed(2)}</Text>,
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<CheckCircle size={14} />}
          loading={actionLoading === record.id}
          onClick={() => handleApproveOrder(record.id)}
          className="rounded-lg h-9 px-4 flex items-center gap-2 font-bold"
        >
          Approve
        </Button>
      ),
    },
  ];

  const consolidatedColumns = [
    {
      title: 'Dish Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong className="text-slate-700 text-base">{text}</Text>
    },
    {
      title: 'Total Prep Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty) => (
        <div className="bg-orange-50 border border-orange-100 px-4 py-1 rounded-full inline-block">
          <Text className="text-orange-600 font-bold text-lg">{qty} Units</Text>
        </div>
      )
    },
    {
      title: 'Total Active Orders',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (count) => <Text className="text-slate-500">{count} pending requests</Text>
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <ChefHat className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Kitchen Dashboard</Title>
              <Text type="secondary">Real-time order management and preparation tracking</Text>
            </div>
          </div>
          <Space size="middle">
             <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex items-center px-3 gap-3 h-12">
                <Text className="text-xs font-bold text-slate-400 uppercase">View Mode</Text>
                <Switch 
                  checkedChildren={<ListFilter size={14} />} 
                  unCheckedChildren={<Group size={14} />} 
                  checked={viewMode === 'orders'}
                  onChange={(checked) => setViewMode(checked ? 'orders' : 'consolidated')}
                />
             </div>
             <Button 
                icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} 
                onClick={() => fetchOrders()}
                className="rounded-xl h-12 flex items-center border-none shadow-sm"
             >
                Sync
             </Button>
          </Space>
        </div>

        {/* Dynamic Stats View */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
            <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Total Orders</Text>
            <Title level={3} style={{ margin: 0 }} className="text-blue-600">{orders.length}</Title>
          </Card>
          <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
            <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Prep Items</Text>
            <Title level={3} style={{ margin: 0 }} className="text-orange-500">{consolidatedItems.length}</Title>
          </Card>
        </div>

        {/* Main Table */}
        {loading ? <OrderSkeleton /> : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
            {orders.length === 0 ? (
              <div className="p-20 text-center">
                <div className="p-6 bg-slate-50 rounded-full inline-block mb-4">
                  <CheckCircle size={48} className="text-emerald-400" />
                </div>
                <Title level={4} className="text-slate-800">Everything is Clear!</Title>
                <Text className="text-slate-400">No pending orders in the queue.</Text>
              </div>
            ) : (
              <Table 
                dataSource={viewMode === 'orders' ? orders : consolidatedItems} 
                columns={viewMode === 'orders' ? orderColumns : consolidatedColumns} 
                rowKey="key"
                pagination={{ pageSize: 8 }}
              />
            )}
          </Card>
        )}
      </div>
    </ConfigProvider>
  );
};

export default MessOrderDashboard;