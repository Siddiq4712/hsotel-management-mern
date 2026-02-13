import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Button, Row, Col, message, Badge, Empty,
  Input, Typography, Tag, Divider, ConfigProvider, Form, Space,
  Skeleton, Table, DatePicker, Segmented, Modal, Descriptions
} from 'antd';
import {
  ShoppingCart, Plus, Minus, Search, UtensilsCrossed, Send,
  History, ShoppingBag, Clock, CheckCircle2, Eye, XCircle, 
  Hash, ClipboardList, Timer, LayoutGrid, AlignJustify, Calendar, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

// --- HELPER: Check if item is expired ---
const isItemExpired = (item) => 
  item.expiry_time && moment(item.expiry_time).isBefore(moment());

// --- LIVE COUNTDOWN COMPONENT ---
const ItemTimer = ({ expiryTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!expiryTime) return;

    const tick = () => {
      const now = moment();
      const end = moment(expiryTime);
      const diff = end.diff(now);

      if (diff <= 0) {
        setTimeLeft("EXPIRED");
        if (onExpire) onExpire();
        return true;
      } else {
        const duration = moment.duration(diff);
        const hours = Math.floor(duration.asHours());
        const mins = duration.minutes();
        const secs = duration.seconds();
        setIsUrgent(hours === 0 && mins < 30);
        setTimeLeft(`${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s`);
        return false;
      }
    };

    const isDone = tick();
    if (isDone) return;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiryTime, onExpire]);

  if (!expiryTime) return null;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
      timeLeft === "EXPIRED" 
        ? 'bg-red-50 text-red-500 border border-red-200' 
        : isUrgent
        ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
        : 'bg-amber-50 text-amber-600 border border-amber-200'
    }`}>
      <Timer size={12} className={timeLeft !== "EXPIRED" && isUrgent ? "animate-pulse" : ""} />
      <span>{timeLeft === "EXPIRED" ? "CLOSED" : `${timeLeft} left`}</span>
    </div>
  );
};

// --- ORDERING TIMELINE COMPONENT ---
const OrderingTimeline = ({ menuItems }) => {
  const timelineItems = useMemo(() => {
    return menuItems
      .filter(item => item.expiry_time)
      .sort((a, b) => moment(a.expiry_time).diff(moment(b.expiry_time)));
  }, [menuItems]);

  if (timelineItems.length === 0) return null;

  const activeItems = timelineItems.filter(item => !isItemExpired(item));
  const expiredItems = timelineItems.filter(item => isItemExpired(item));

  return (
    <Card className="border-none shadow-sm rounded-[24px] mb-6 border-l-4 border-l-amber-500">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Calendar size={20} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <Title level={4} className="m-0">Ordering Timeline</Title>
          <Text type="secondary" className="text-xs">Follow deadlines to secure your meal</Text>
        </div>
      </div>

      <div className="space-y-2">
        {activeItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
            <Text strong className="text-amber-900">{item.name}</Text>
            <ItemTimer expiryTime={item.expiry_time} />
          </div>
        ))}
        {expiredItems.length > 0 && (
          <div className="mt-4 pt-2 border-t border-dashed">
            <Text type="secondary" className="text-[10px] font-bold uppercase block mb-2">Recently Closed</Text>
            {expiredItems.slice(0, 3).map(item => (
              <div key={item.id} className="flex justify-between items-center opacity-50 mb-1">
                <Text className="text-xs">{item.name}</Text>
                <Tag color="default" className="text-[9px] m-0">CLOSED</Tag>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

const StudentFoodMenu = () => {
  const [activeTab, setActiveTab] = useState('Menu');
  const [viewMode, setViewMode] = useState('tiles');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  // Fetch Menu
  const fetchMenuData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getSpecialFoodItems({ is_available: true });
      const items = response.data.data || [];
      setMenuItems(items);
      const uniqueCats = [...new Set(items.map(item => item.category))];
      setCategories(uniqueCats);
    } catch (error) {
      message.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = {};
      if (dateRange && dateRange[0]) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const response = await studentAPI.getFoodOrders(params);
      setOrders(response.data.data || []);
    } catch (error) {
      message.error('Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchMenuData(); }, [fetchMenuData]);
  useEffect(() => { if (activeTab === 'History') fetchOrders(); }, [activeTab, fetchOrders]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCat = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [menuItems, activeCategory, searchTerm]);

  const cartTotal = useMemo(() => Object.values(cart).reduce((s, c) => s + (c.item.price * c.quantity), 0), [cart]);
  const cartCount = useMemo(() => Object.values(cart).reduce((s, c) => s + c.quantity, 0), [cart]);

  // Actions
  const handleAddToCart = (item) => {
    if (isItemExpired(item)) {
      message.error("Ordering window for this item has closed.");
      return;
    }
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[item.id]) newCart[item.id].quantity += 1;
      else newCart[item.id] = { item, quantity: 1 };
      return newCart;
    });
  };

  const handleUpdateQuantity = (itemId, change) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (change > 0 && isItemExpired(newCart[itemId].item)) {
        message.warning("Item deadline has passed. Cannot add more.");
        return prev;
      }
      newCart[itemId].quantity += change;
      if (newCart[itemId].quantity <= 0) delete newCart[itemId];
      return newCart;
    });
  };

  const handlePlaceOrder = async () => {
    const expiredInCart = Object.values(cart).find(c => isItemExpired(c.item));
    if (expiredInCart) {
      message.error(`Ordering for ${expiredInCart.item.name} just expired. Please remove it.`);
      return;
    }

    setIsPlacingOrder(true);
    try {
      const payload = {
        items: Object.values(cart).map(c => ({ food_item_id: c.item.id, quantity: c.quantity })),
        notes: orderNotes
      };
      await studentAPI.createFoodOrder(payload);
      message.success("Order placed successfully!");
      setCart({});
      setOrderNotes("");
      setActiveTab('History');
    } catch (e) {
      message.error("Order placement failed.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Status Helpers
  const getStatusColor = (s) => ({
    'pending': 'orange', 'confirmed': 'blue', 'preparing': 'cyan', 
    'ready': 'green', 'delivered': 'success', 'cancelled': 'red'
  }[s?.toLowerCase()] || 'default');

  const orderColumns = [
    { title: 'Order ID', dataIndex: 'id', key: 'id', render: id => <Text strong>#{id}</Text> },
    { title: 'Total', dataIndex: 'total_price', key: 'total_price', render: p => <Text className="text-blue-600 font-bold">₹{p}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: s => <Tag color={getStatusColor(s)}>{s?.toUpperCase()}</Tag> },
    { title: 'Date', dataIndex: 'created_at', key: 'created_at', render: d => moment(d).format('DD MMM, hh:mm A') },
    { title: 'Action', key: 'action', align: 'right', render: (_, record) => <Button size="small" onClick={() => { setSelectedOrder(record); setViewModalVisible(true); }}>View</Button> }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg text-white">
              <UtensilsCrossed size={24} />
            </div>
            <div>
              <Title level={2} className="m-0">Mess Canteen</Title>
              <Text type="secondary">Fresh specials delivered daily</Text>
            </div>
          </div>
          <Space>
            {activeTab === 'Menu' && cartCount > 0 && (
              <Badge count={cartCount}><Button type="primary" icon={<ShoppingCart size={18}/>} size="large">₹{cartTotal}</Button></Badge>
            )}
            <Segmented 
              size="large" 
              options={[{label:'Menu', value:'Menu', icon:<LayoutGrid size={14}/>}, {label:'Orders', value:'History', icon:<History size={14}/>}]} 
              value={activeTab} 
              onChange={setActiveTab} 
            />
          </Space>
        </div>

        {activeTab === 'Menu' ? (
          <Row gutter={[24, 24]}>
            <Col lg={16} xs={24}>
              <OrderingTimeline menuItems={menuItems} />
              
              <Card className="border-none shadow-sm rounded-2xl mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                  <Input prefix={<Search size={18}/>} placeholder="Search food..." className="h-12 rounded-xl max-w-md" onChange={e => setSearchTerm(e.target.value)} />
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <Button type={activeCategory === 'all' ? 'primary' : 'default'} onClick={() => setActiveCategory('all')}>All</Button>
                    {categories.map(c => <Button key={c} type={activeCategory === c ? 'primary' : 'default'} onClick={() => setActiveCategory(c)}>{c}</Button>)}
                  </div>
                </div>
              </Card>

              {loading ? <Skeleton active /> : (
                <div className={viewMode === 'tiles' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}>
                  {filteredMenuItems.map(item => {
                    const expired = isItemExpired(item);
                    return (
                      <Card 
                        key={item.id} 
                        className={`border-none shadow-sm rounded-[24px] transition-all ${expired ? 'opacity-60 bg-slate-100 grayscale-[0.5]' : 'hover:shadow-md'}`}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex justify-between items-start mb-2">
                            <Tag color="blue" className="text-[10px] uppercase font-bold m-0">{item.category}</Tag>
                            <ItemTimer expiryTime={item.expiry_time} />
                          </div>
                          <Title level={5} className="mb-1">{item.name}</Title>
                          <Paragraph type="secondary" className="text-xs flex-1 line-clamp-2">{item.description}</Paragraph>
                          <div className="flex items-center justify-between mt-4">
                            <Text strong className="text-lg text-blue-600">₹{item.price}</Text>
                            
                            {/* EXPIRED LOGIC: BUTTON IS DISABLED/REPLACED */}
                            {expired ? (
                              <Tag color="red" className="m-0 px-3 py-1 font-bold rounded-lg border-none">CLOSED</Tag>
                            ) : cart[item.id] ? (
                              <Space className="bg-blue-50 p-1 rounded-xl">
                                <Button size="small" type="text" icon={<Minus size={14}/>} onClick={() => handleUpdateQuantity(item.id, -1)} />
                                <Text strong className="px-1">{cart[item.id].quantity}</Text>
                                <Button size="small" type="text" icon={<Plus size={14}/>} onClick={() => handleAddToCart(item)} />
                              </Space>
                            ) : (
                              <Button type="primary" shape="round" onClick={() => handleAddToCart(item)}>Add</Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Col>

            {/* Cart Sidebar */}
            <Col lg={8} xs={24}>
              <Card className="rounded-[32px] border-none shadow-lg sticky top-8 overflow-hidden" 
                title={<div className="flex items-center gap-2 py-1"><ShoppingCart size={20}/> Your Selection</div>}
                extra={cartCount > 0 && <Button type="text" danger icon={<Trash2 size={16}/>} onClick={() => setCart({})} />}
              >
                {cartCount === 0 ? <Empty description="Cart is empty" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
                  <div className="space-y-4">
                    <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2">
                      {Object.values(cart).map(({item, quantity}) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                          <div className="flex-1 mr-2">
                            <Text strong className="block text-xs">{item.name}</Text>
                            {isItemExpired(item) && <Tag color="red" className="text-[9px]">EXPIRED</Tag>}
                          </div>
                          <Space>
                            <Button size="small" shape="circle" icon={<Minus size={12}/>} onClick={() => handleUpdateQuantity(item.id, -1)} />
                            <Text strong>{quantity}</Text>
                            <Button size="small" shape="circle" icon={<Plus size={12}/>} onClick={() => handleAddToCart(item)} disabled={isItemExpired(item)} />
                          </Space>
                        </div>
                      ))}
                    </div>
                    <Divider className="my-2"/>
                    <TextArea placeholder="Instructions (Optional)..." rows={2} className="rounded-xl" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} />
                    <div className="flex justify-between items-center pt-2">
                      <Text type="secondary">Total Amount</Text>
                      <Text strong className="text-xl text-blue-600">₹{cartTotal}</Text>
                    </div>
                    <Button type="primary" block size="large" className="h-12 text-lg font-bold" loading={isPlacingOrder} onClick={handlePlaceOrder}>Place Order</Button>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        ) : (
          <Card className="border-none shadow-sm rounded-2xl">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <Title level={4} className="m-0">My Orders</Title>
              <RangePicker className="rounded-xl" onChange={setDateRange} />
            </div>
            <Table columns={orderColumns} dataSource={orders} loading={ordersLoading} rowKey="id" pagination={{pageSize: 8}} />
          </Card>
        )}

        {/* Order Details Modal */}
        <Modal
          title={`Order Details #${selectedOrder?.id}`}
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={[<Button key="ok" type="primary" onClick={() => setViewModalVisible(false)}>Got it</Button>]}
          centered
          width={500}
        >
          {selectedOrder && (
            <div className="py-2">
              <Descriptions bordered column={1} size="small" className="mb-4">
                <Descriptions.Item label="Status"><Tag color={getStatusColor(selectedOrder.status)}>{selectedOrder.status.toUpperCase()}</Tag></Descriptions.Item>
                <Descriptions.Item label="Placed On">{moment(selectedOrder.created_at).format('DD MMM YYYY, hh:mm A')}</Descriptions.Item>
                <Descriptions.Item label="Notes">{selectedOrder.notes || 'None'}</Descriptions.Item>
              </Descriptions>
              <Text strong className="block mb-2">Items Ordered:</Text>
              <div className="bg-slate-50 p-4 rounded-2xl">
                {selectedOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between mb-2 last:mb-0">
                    <Text>{it.food_item_name} <Text type="secondary" className="text-xs">x{it.quantity}</Text></Text>
                    <Text strong>₹{it.price_at_order * it.quantity}</Text>
                  </div>
                ))}
                <Divider className="my-2"/>
                <div className="flex justify-between"><Text strong>Grand Total</Text><Text strong className="text-blue-600">₹{selectedOrder.total_price}</Text></div>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </ConfigProvider>
  );
};

export default StudentFoodMenu;