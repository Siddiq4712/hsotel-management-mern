import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, DatePicker, Button, Space, Tag, Typography, 
  Timeline, Badge, Modal, message, ConfigProvider, theme, 
  Skeleton, Descriptions, Divider, Empty, Tooltip 
} from 'antd';
import { 
  Eye, XCircle, Search, RefreshCw, ClipboardList, 
  History, ShoppingBag, Clock, CheckCircle2, Truck, 
  AlertTriangle, IndianRupee, Utensils, Inbox, ChevronLeft, ChevronRight
} from 'lucide-react';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

const OrderSkeleton = () => (
  <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
    <Skeleton.Input active style={{ width: 300 }} />
    <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white">
      <Skeleton active paragraph={{ rows: 10 }} />
    </Card>
  </div>
);

const MyFoodOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let params = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        params = {
          from_date: dateRange[0].format('YYYY-MM-DD'),
          to_date: dateRange[1].format('YYYY-MM-DD')
        };
      }
      const response = await studentAPI.getFoodOrders(params);
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      message.error('Failed to sync institutional canteen logs.');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  }, [dateRange]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleCancelOrder = (id) => {
    Modal.confirm({
      title: 'Confirm Cancellation',
      icon: <AlertTriangle className="text-rose-500 mr-2" size={22} />,
      content: 'Warden approval may be required if preparation has begun. Proceed?',
      okText: 'Yes, Void Request',
      okType: 'danger',
      cancelText: 'Back',
      className: 'rounded-3xl',
      onOk: async () => {
        try {
          const response = await studentAPI.cancelFoodOrder(id);
          if (response.data.success) {
            message.success('Request voided successfully');
            fetchOrders();
          }
        } catch (e) { message.error('Cancellation rejected by server.'); }
      },
    });
  };

  const statusMap = {
    pending: { color: 'warning', icon: <Clock size={12} />, label: 'Requested' },
    confirmed: { color: 'blue', icon: <CheckCircle2 size={12} />, label: 'Confirmed' },
    preparing: { color: 'purple', icon: <Utensils size={12} />, label: 'In Kitchen' },
    ready: { color: 'cyan', icon: <ShoppingBag size={12} />, label: 'At Counter' },
    delivered: { color: 'success', icon: <Truck size={12} />, label: 'Served' },
    cancelled: { color: 'error', icon: <XCircle size={12} />, label: 'Cancelled' }
  };

  const columns = [
    {
      title: 'Order Ref',
      key: 'id',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">ORD-#{r.id}</Text>
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {moment(r.order_date).format('DD MMM, hh:mm A')}
          </Text>
        </Space>
      )
    },
    {
      title: 'Workflow Status',
      dataIndex: 'status',
      render: (status) => (
        <Tag 
          icon={statusMap[status]?.icon} 
          color={statusMap[status]?.color} 
          className="rounded-full border-none px-3 font-bold uppercase text-[10px]"
        >
          {statusMap[status]?.label || status}
        </Tag>
      )
    },
    {
      title: 'Recon Amount',
      dataIndex: 'total_amount',
      align: 'right',
      render: (amt) => (
        <Text strong className="text-blue-600">₹{parseFloat(amt).toFixed(2)}</Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Button 
            icon={<Eye size={14}/>} 
            className="rounded-lg border-none shadow-sm bg-slate-50 hover:bg-blue-50 transition-colors"
            onClick={() => { setSelectedOrder(r); setViewModalVisible(true); }}
          />
          {r.status === 'pending' && (
            <Tooltip title="Void Request">
              <Button 
                danger 
                type="text" 
                icon={<XCircle size={14}/>} 
                onClick={() => handleCancelOrder(r.id)} 
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  if (loading) return <OrderSkeleton />;

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen space-y-8">
        
        {/* Institutional Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <ClipboardList className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Canteen Requests</Title>
              <Text type="secondary">Monitor special meal requests and their impact on your mess ledger</Text>
            </div>
          </div>
          <Badge count={orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length} overflowCount={99}>
             <div className="bg-white p-3 px-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                <Clock size={16} className="text-blue-600" />
                <Text strong className="text-[11px] uppercase tracking-wider text-slate-500">Live Requests</Text>
             </div>
          </Badge>
        </div>

        {/* Filter Toolbar */}
        <Card className="border-none shadow-sm rounded-[24px]">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3 bg-slate-50 p-1 px-3 rounded-xl border border-slate-100 flex-1 md:max-w-md focus-within:border-blue-300 transition-all">
              <Search size={18} className="text-slate-300" />
              <DatePicker.RangePicker 
                value={dateRange} 
                onChange={(val) => { setDateRange(val); setCurrentPage(1); }} 
                bordered={false} 
                className="w-full h-10 font-medium"
              />
            </div>
            <Button 
              type="primary" 
              icon={<Search size={16}/>} 
              onClick={fetchOrders} 
              className="rounded-xl h-12 px-8 font-bold shadow-lg shadow-blue-100"
            >
              Apply Filter
            </Button>
            <Button 
              icon={<RefreshCw size={16}/>} 
              onClick={() => { setDateRange(null); setCurrentPage(1); fetchOrders(); }}
              className="rounded-xl h-12 w-12 flex items-center justify-center border-slate-200"
            />
          </div>
        </Card>

        {/* Data Container */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
          {orders.length > 0 ? (
            <Table 
              dataSource={orders} 
              columns={columns} 
              rowKey="id" 
              pagination={{ 
                current: currentPage,
                pageSize: pageSize,
                onChange: (p) => setCurrentPage(p),
                position: ['bottomCenter'],
                showSizeChanger: false,
                itemRender: (page, type, originalElement) => {
                  if (type === 'prev') return <Button type="text" icon={<ChevronLeft size={14}/>} />;
                  if (type === 'next') return <Button type="text" icon={<ChevronRight size={14}/>} />;
                  return originalElement;
                }
              }}
            />
          ) : (
            <div className="py-24 flex flex-col items-center justify-center bg-white">
              <Empty 
                image={<div className="bg-slate-50 p-8 rounded-full mb-4"><Inbox size={64} className="text-slate-200" /></div>}
                description={
                  <div className="space-y-1">
                    <Text strong className="text-slate-600 text-lg block">No Requests Found</Text>
                    <Text className="text-slate-400 block">Your institutional canteen order history for this period is empty.</Text>
                  </div>
                }
              >
                <Button type="link" onClick={() => { setDateRange(null); fetchOrders(); }} className="font-bold text-blue-600 mt-2">
                  View All Orders
                </Button>
              </Empty>
            </div>
          )}
        </Card>

        {/* Audit Modal (Unchanged Detail Logic) */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><ClipboardList size={20}/> Canteen Audit Dossier</div>}
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={<Button type="primary" onClick={() => setViewModalVisible(false)} className="rounded-xl h-11 px-8">Close Dossier</Button>}
          width={800}
          className="rounded-[32px]"
        >
          {selectedOrder && (
            <div className="mt-6 space-y-6">
              <Descriptions bordered column={2} className="bg-slate-50/50 rounded-2xl overflow-hidden">
                <Descriptions.Item label="Ref ID">REC-#{selectedOrder.id}</Descriptions.Item>
                <Descriptions.Item label="Serving Status">
                   {statusMap[selectedOrder.status]?.label}
                </Descriptions.Item>
                <Descriptions.Item label="Amount">₹{parseFloat(selectedOrder.total_amount).toFixed(2)}</Descriptions.Item>
                <Descriptions.Item label="Notes">{selectedOrder.notes || 'N/A'}</Descriptions.Item>
              </Descriptions>

              <Table
                dataSource={selectedOrder.FoodOrderItems}
                rowKey="id"
                pagination={false}
                size="small"
                className="border border-slate-100 rounded-xl overflow-hidden"
                columns={[
                  { title: 'Item', dataIndex: ['SpecialFoodItem', 'name'] },
                  { title: 'Qty', dataIndex: 'quantity', align: 'center' },
                  { title: 'Subtotal', dataIndex: 'subtotal', align: 'right', render: (s) => `₹${parseFloat(s).toFixed(2)}` }
                ]}
              />
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default MyFoodOrders;