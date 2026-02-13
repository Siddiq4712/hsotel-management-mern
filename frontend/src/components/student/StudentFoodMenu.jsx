import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Button, Row, Col, message, Badge, Empty,
  Input, Typography, Tag, Divider, ConfigProvider, Form, Space,
  Skeleton, Table, DatePicker, Segmented, Modal, Descriptions, Tooltip, Alert
} from 'antd';
import {
  ShoppingCart, Plus, Minus, Coffee, Search, UtensilsCrossed, Send,
  History, ShoppingBag, Clock, CheckCircle2, Truck, AlertTriangle, Eye, XCircle, 
  Hash, ClipboardList, Timer, LayoutGrid, AlignJustify, List as ListIcon, 
  Maximize, Square, Calendar, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

// --- LIVE COUNTDOWN COMPONENT ---
const ItemTimer = ({ expiryTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!expiryTime) return;

    const interval = setInterval(() => {
      const now = moment();
      const end = moment(expiryTime);
      const diff = end.diff(now);

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft("EXPIRED");
        if (onExpire) onExpire();
      } else {
        const duration = moment.duration(diff);
        const hours = Math.floor(duration.asHours());
        const mins = duration.minutes();
        const secs = duration.seconds();
        
        // Mark as urgent if less than 30 minutes
        setIsUrgent(hours === 0 && mins < 30);
        
        setTimeLeft(`${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s`);
      }
    }, 1000);

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
    const itemsWithDeadlines = menuItems.filter(item => item.expiry_time);
    if (itemsWithDeadlines.length === 0) return [];

    // Sort by expiry time
    const sorted = itemsWithDeadlines.sort((a, b) => 
      moment(a.expiry_time).diff(moment(b.expiry_time))
    );

    return sorted.map(item => ({
      ...item,
      isExpired: moment(item.expiry_time).isBefore(moment()),
      timeUntil: moment(item.expiry_time).fromNow(),
      isUrgent: moment(item.expiry_time).diff(moment(), 'minutes') < 30
    }));
  }, [menuItems]);

  if (timelineItems.length === 0) return null;

  const activeItems = timelineItems.filter(item => !item.isExpired);
  const expiredItems = timelineItems.filter(item => item.isExpired);

  return (
    <Card className="border-none shadow-sm rounded-[24px] mb-6 border-l-4 border-l-amber-500">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Calendar size={20} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <Title level={4} className="m-0">Ordering Timeline</Title>
          <Text type="secondary">Time-limited items set by mess admin</Text>
        </div>
        {activeItems.length > 0 && (
          <Badge 
            count={`${activeItems.length} Active`} 
            style={{ backgroundColor: '#f59e0b' }}
          />
        )}
      </div>

      <div className="space-y-3">
        {/* Active Items */}
        {activeItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
              item.isUrgent 
                ? 'bg-red-50 border-red-400' 
                : 'bg-amber-50 border-amber-400'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-3 h-3 rounded-full ${
                item.isUrgent ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
              }`}></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Text strong className={item.isUrgent ? 'text-red-700' : 'text-slate-800'}>
                    {item.name}
                  </Text>
                  <Tag color={item.category === 'Snacks' ? 'orange' : 'blue'} className="text-[9px]">
                    {item.category}
                  </Tag>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={12} className="text-slate-400" />
                  <Text type="secondary" className="text-xs">
                    Expires {item.timeUntil}
                  </Text>
                </div>
              </div>
            </div>
            <div className="text-right ml-4">
              <Text className="text-sm font-medium block">
                {moment(item.expiry_time).format('hh:mm A')}
              </Text>
              <Text type="secondary" className="text-xs">
                {moment(item.expiry_time).format('DD MMM')}
              </Text>
            </div>
          </motion.div>
        ))}

        {/* Expired Items */}
        {expiredItems.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Text type="secondary" className="text-xs font-semibold uppercase mb-2 block">
              Expired ({expiredItems.length})
            </Text>
            {expiredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg opacity-60 mb-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <div>
                    <Text className="text-slate-600">{item.name}</Text>
                    <div className="flex items-center gap-2 mt-1">
                      <XCircle size={12} className="text-slate-400" />
                      <Text type="secondary" className="text-xs">
                        Expired {item.timeUntil}
                      </Text>
                    </div>
                  </div>
                </div>
                <Tag color="red" className="text-xs">Closed</Tag>
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
  const [cartBump, setCartBump] = useState(false);

  const fetchMenuData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getSpecialFoodItems({ is_available: true });
      const items = response.data.data || [];
      
      // Filter out expired items on initial load
      const activeItems = items.filter(item => {
        if (!item.expiry_time) return true;
        return moment(item.expiry_time).isAfter(moment());
      });
      
      setMenuItems(activeItems);
      const uniqueCategories = [...new Set(activeItems.map(item => item.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      message.error('Failed to load menu items');
      console.error(error);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const response = await studentAPI.getFoodOrders(params);
      setOrders(response.data.data || []);
    } catch (error) {
      message.error('Failed to load order history');
    } finally {
      setOrdersLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  useEffect(() => {
    if (activeTab === 'History') {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  // --- FILTERING LOGIC (Hides expired items) ---
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Safety: Hide if expiry time has passed
      const isExpired = item.expiry_time && moment(item.expiry_time).isBefore(moment());
      
      return matchesCategory && matchesSearch && !isExpired;
    });
  }, [menuItems, activeCategory, searchTerm]);

  // Remove expired items from cart automatically
  useEffect(() => {
    const expiredCartItems = Object.values(cart).filter(c => 
      c.item.expiry_time && moment(c.item.expiry_time).isBefore(moment())
    );
    
    if (expiredCartItems.length > 0) {
      const newCart = { ...cart };
      expiredCartItems.forEach(c => {
        delete newCart[c.item.id];
        message.warning(`${c.item.name} has expired and been removed from cart`);
      });
      setCart(newCart);
    }
  }, [cart]);

  const handleAddToCart = (item) => {
    // Check if item has expired
    if (item.expiry_time && moment(item.expiry_time).isBefore(moment())) {
      message.error(`Sorry, ordering deadline for ${item.name} has passed`);
      fetchMenuData(); // Refresh to remove expired items
      return;
    }

    const newCart = { ...cart };
    if (newCart[item.id]) {
      newCart[item.id].quantity += 1;
    } else {
      newCart[item.id] = { item: item, quantity: 1 };
    }
    setCart(newCart);
    setCartBump(true);
    setTimeout(() => setCartBump(false), 300);
    message.success(`${item.name} added to cart`);
  };

  const handleUpdateQuantity = (itemId, change) => {
    const newCart = { ...cart };
    if (newCart[itemId]) {
      newCart[itemId].quantity += change;
      if (newCart[itemId].quantity <= 0) {
        delete newCart[itemId];
      }
      setCart(newCart);
    }
  };

  const handleRemoveFromCart = (itemId) => {
    const newCart = { ...cart };
    delete newCart[itemId];
    setCart(newCart);
    message.info('Item removed from cart');
  };

  const handlePlaceOrder = async () => {
    if (Object.keys(cart).length === 0) {
      message.warning('Your cart is empty');
      return;
    }

    // --- FINAL VALIDATION BEFORE ORDER ---
    const expiredItem = Object.values(cart).find(c => 
      c.item.expiry_time && moment(c.item.expiry_time).isBefore(moment())
    );
    
    if (expiredItem) {
      message.error(`Sorry, the ordering deadline for ${expiredItem.item.name} just passed!`);
      const newCart = { ...cart };
      delete newCart[expiredItem.item.id];
      setCart(newCart);
      return;
    }

    setIsPlacingOrder(true);
    try {
      const orderData = {
        items: Object.values(cart).map(c => ({ 
          food_item_id: c.item.id, 
          quantity: c.quantity 
        })),
        notes: orderNotes || ""
      };
      
      await studentAPI.createFoodOrder(orderData);
      message.success('Order placed successfully!');
      setCart({});
      setOrderNotes("");
      setActiveTab('History');
      fetchOrders();
    } catch (error) {
      message.error('Failed to place order. Please try again.');
      console.error(error);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setViewModalVisible(true);
  };

  const cartTotal = useMemo(() => {
    return Object.values(cart).reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, c) => sum + c.quantity, 0);
  }, [cart]);

  // --- RENDER TILES VIEW ---
  const renderTilesView = () => (
    <AnimatePresence>
      <Row gutter={[16, 16]}>
        {filteredMenuItems.map((item, index) => (
          <Col xs={24} sm={12} lg={8} key={item.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="border-none shadow-sm rounded-[24px] hover:shadow-lg transition-all h-full border-l-4 border-l-blue-500 overflow-hidden"
                bodyStyle={{ padding: '20px' }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Tag color="blue" className="rounded-full px-2 text-[9px] font-bold uppercase border-none m-0">
                        {item.category}
                      </Tag>
                      <ItemTimer expiryTime={item.expiry_time} onExpire={fetchMenuData} />
                    </div>
                    <Title level={5} className="m-0 mb-1">{item.name}</Title>
                    {item.description && (
                      <Paragraph 
                        ellipsis={{ rows: 2 }} 
                        className="text-slate-500 text-xs m-0"
                      >
                        {item.description}
                      </Paragraph>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <Text strong className="text-lg text-blue-600">₹{item.price}</Text>
                  {cart[item.id] ? (
                    <Space>
                      <Button
                        size="small"
                        icon={<Minus size={14}/>}
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="rounded-lg"
                      />
                      <Text strong>{cart[item.id].quantity}</Text>
                      <Button
                        size="small"
                        icon={<Plus size={14}/>}
                        onClick={() => handleAddToCart(item)}
                        type="primary"
                        className="rounded-lg"
                      />
                    </Space>
                  ) : (
                    <Button
                      type="primary"
                      size="small"
                      icon={<Plus size={14}/>}
                      onClick={() => handleAddToCart(item)}
                      className="rounded-lg"
                    >
                      Add
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>
    </AnimatePresence>
  );

  // --- RENDER LIST VIEW ---
  const renderListView = () => (
    <div className="space-y-3">
      {filteredMenuItems.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          <Card className="border-none shadow-sm rounded-2xl hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
                  ) : (
                    <UtensilsCrossed size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Title level={5} className="m-0">{item.name}</Title>
                    <Tag color="blue" className="text-[9px]">{item.category}</Tag>
                    <ItemTimer expiryTime={item.expiry_time} onExpire={fetchMenuData} />
                  </div>
                  {item.description && (
                    <Text type="secondary" className="text-xs">{item.description}</Text>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 ml-4">
                <Text strong className="text-xl text-blue-600">₹{item.price}</Text>
                {cart[item.id] ? (
                  <Space>
                    <Button
                      icon={<Minus size={14}/>}
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                    />
                    <Text strong className="w-8 text-center">{cart[item.id].quantity}</Text>
                    <Button
                      icon={<Plus size={14}/>}
                      onClick={() => handleAddToCart(item)}
                      type="primary"
                    />
                  </Space>
                ) : (
                  <Button
                    type="primary"
                    icon={<Plus size={14}/>}
                    onClick={() => handleAddToCart(item)}
                  >
                    Add to Cart
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  // --- ORDER STATUS COLOR ---
  const getStatusColor = (status) => {
    const colorMap = {
      'pending': 'orange',
      'confirmed': 'blue',
      'preparing': 'cyan',
      'ready': 'green',
      'delivered': 'success',
      'cancelled': 'red'
    };
    return colorMap[status?.toLowerCase()] || 'default';
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'pending': <Clock size={14} />,
      'confirmed': <CheckCircle2 size={14} />,
      'preparing': <UtensilsCrossed size={14} />,
      'ready': <ShoppingBag size={14} />,
      'delivered': <CheckCircle2 size={14} />,
      'cancelled': <XCircle size={14} />
    };
    return iconMap[status?.toLowerCase()] || <AlertTriangle size={14} />;
  };

  // --- ORDER HISTORY TABLE COLUMNS ---
  const orderColumns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => (
        <Space>
          <Hash size={14} className="text-slate-400" />
          <Text strong>#{id}</Text>
        </Space>
      )
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items) => (
        <div>
          <Text>{items?.length || 0} item(s)</Text>
          {items && items.length > 0 && (
            <div className="mt-1">
              {items.slice(0, 2).map((item, idx) => (
                <Tag key={idx} className="text-[10px] mb-1">
                  {item.food_item_name} x{item.quantity}
                </Tag>
              ))}
              {items.length > 2 && (
                <Tag className="text-[10px]">+{items.length - 2} more</Tag>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Total',
      dataIndex: 'total_price',
      key: 'total_price',
      render: (price) => <Text strong className="text-blue-600">₹{price}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Ordered On',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (
        <div>
          <Text className="block text-xs">{moment(date).format('DD MMM YYYY')}</Text>
          <Text type="secondary" className="text-[10px]">{moment(date).format('hh:mm A')}</Text>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Button
          icon={<Eye size={14} />}
          onClick={() => handleViewOrder(record)}
          size="small"
        >
          View
        </Button>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
              <UtensilsCrossed className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Student Canteen</Title>
              <Text type="secondary">
                Order special items before the deadline expires
              </Text>
            </div>
          </div>
          <Space size="large">
            {activeTab === 'Menu' && cartCount > 0 && (
              <motion.div
                animate={cartBump ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Badge count={cartCount} offset={[-5, 5]}>
                  <Button 
                    type="primary" 
                    icon={<ShoppingCart size={18} />}
                    size="large"
                    className="rounded-xl"
                  >
                    ₹{cartTotal}
                  </Button>
                </Badge>
              </motion.div>
            )}
            <Segmented
              size="large"
              options={[
                { 
                  label: (
                    <Space>
                      <UtensilsCrossed size={16} />
                      <span>Menu</span>
                    </Space>
                  ), 
                  value: 'Menu' 
                },
                { 
                  label: (
                    <Space>
                      <History size={16} />
                      <span>My Orders</span>
                    </Space>
                  ), 
                  value: 'History' 
                }
              ]}
              value={activeTab}
              onChange={setActiveTab}
            />
          </Space>
        </div>

        {/* Timeline Component (Only on Menu Tab) */}
        {activeTab === 'Menu' && <OrderingTimeline menuItems={menuItems} />}

        {activeTab === 'Menu' ? (
          <Row gutter={[24, 24]}>
            {/* Menu Items Section */}
            <Col lg={16} xs={24}>
              <Card className="border-none shadow-sm rounded-[24px] mb-4">
                <div className="flex gap-4 mb-6 flex-wrap">
                  <Input 
                    prefix={<Search size={18}/>} 
                    placeholder="Search dishes..." 
                    className="h-12 rounded-xl flex-1"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    allowClear
                  />
                  <Segmented
                    options={[
                      { label: <LayoutGrid size={18} />, value: 'tiles' },
                      { label: <AlignJustify size={18} />, value: 'list' }
                    ]}
                    value={viewMode}
                    onChange={setViewMode}
                  />
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 mb-6 flex-wrap">
                  <Button
                    type={activeCategory === 'all' ? 'primary' : 'default'}
                    onClick={() => setActiveCategory('all')}
                    className="rounded-xl"
                  >
                    All Items
                  </Button>
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      type={activeCategory === cat ? 'primary' : 'default'}
                      onClick={() => setActiveCategory(cat)}
                      className="rounded-xl"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </Card>

              {loading ? (
                <div className="space-y-4">
                  <Skeleton active />
                  <Skeleton active />
                  <Skeleton active />
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <Card className="border-none shadow-sm rounded-[24px]">
                  <Empty 
                    description="No items available at the moment"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </Card>
              ) : (
                viewMode === 'tiles' ? renderTilesView() : renderListView()
              )}
            </Col>

            {/* Cart Section */}
            <Col lg={8} xs={24}>
              <Card 
                className="border-none shadow-sm rounded-[32px] sticky top-8" 
                title={
                  <div className="flex items-center justify-between">
                    <Space>
                      <ShoppingCart size={20}/>
                      <Text strong>Your Cart</Text>
                    </Space>
                    <Badge count={cartCount} style={{ backgroundColor: '#2563eb' }} />
                  </div>
                }
              >
                {Object.keys(cart).length > 0 ? (
                  <div className="space-y-4">
                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                      {Object.values(cart).map(({ item, quantity }) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex justify-between items-start p-3 bg-slate-50 rounded-xl"
                        >
                          <div className="flex-1">
                            <Text strong className="block">{item.name}</Text>
                            <Text type="secondary" className="text-xs">₹{item.price} each</Text>
                            {item.expiry_time && (
                              <div className="mt-1">
                                <ItemTimer expiryTime={item.expiry_time} />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-3">
                            <Space>
                              <Button 
                                size="small" 
                                icon={<Minus size={12}/>} 
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                className="rounded-lg"
                              />
                              <Text strong>{quantity}</Text>
                              <Button 
                                size="small" 
                                icon={<Plus size={12}/>} 
                                onClick={() => handleAddToCart(item)}
                                type="primary"
                                className="rounded-lg"
                              />
                            </Space>
                            <Text strong className="text-blue-600">₹{item.price * quantity}</Text>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <Divider />

                    <Form layout="vertical">
                      <Form.Item label="Order Notes (Optional)">
                        <TextArea
                          rows={3}
                          placeholder="Any special instructions..."
                          value={orderNotes}
                          onChange={e => setOrderNotes(e.target.value)}
                          maxLength={200}
                          showCount
                        />
                      </Form.Item>
                    </Form>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <Text type="secondary" className="block text-xs">Total Amount</Text>
                          <Text strong className="text-2xl text-blue-600">₹{cartTotal}</Text>
                        </div>
                        <Text type="secondary" className="text-xs">
                          {cartCount} item{cartCount > 1 ? 's' : ''}
                        </Text>
                      </div>
                      <Button 
                        type="primary" 
                        block 
                        size="large" 
                        icon={<Send size={18} />}
                        onClick={handlePlaceOrder} 
                        loading={isPlacingOrder}
                        className="rounded-xl h-12"
                      >
                        Place Order
                      </Button>
                      <Button
                        block
                        className="mt-2 rounded-xl"
                        onClick={() => {
                          Modal.confirm({
                            title: 'Clear cart?',
                            content: 'This will remove all items from your cart.',
                            onOk: () => {
                              setCart({});
                              message.success('Cart cleared');
                            }
                          });
                        }}
                      >
                        Clear Cart
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Your cart is empty"
                  >
                    <Text type="secondary" className="block text-xs mt-2">
                      Add items from the menu to get started
                    </Text>
                  </Empty>
                )}
              </Card>
            </Col>
          </Row>
        ) : (
          /* Order History Section */
          <div className="bg-white p-6 rounded-3xl shadow-sm">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div>
                <Title level={3} className="m-0">Order History</Title>
                <Text type="secondary">Track your food orders</Text>
              </div>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="DD MMM YYYY"
                className="rounded-xl"
              />
            </div>

            <Table
              loading={ordersLoading}
              dataSource={orders}
              columns={orderColumns}
              rowKey="id"
              pagination={{ 
                pageSize: 10,
                showTotal: (total) => `Total ${total} orders`
              }}
              className="custom-table"
            />
          </div>
        )}

        {/* Order Details Modal */}
        <Modal
          title={
            <Space>
              <ClipboardList size={20} />
              <span>Order Details</span>
            </Space>
          }
          open={viewModalVisible}
          onCancel={() => {
            setViewModalVisible(false);
            setSelectedOrder(null);
          }}
          footer={null}
          width={600}
          centered
        >
          {selectedOrder && (
            <div className="space-y-4">
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Order ID" span={2}>
                  <Text strong>#{selectedOrder.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status" span={2}>
                  <Tag color={getStatusColor(selectedOrder.status)} icon={getStatusIcon(selectedOrder.status)}>
                    {selectedOrder.status?.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Order Date">
                  {moment(selectedOrder.created_at).format('DD MMM YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="Order Time">
                  {moment(selectedOrder.created_at).format('hh:mm A')}
                </Descriptions.Item>
                <Descriptions.Item label="Total Amount" span={2}>
                  <Text strong className="text-lg text-blue-600">₹{selectedOrder.total_price}</Text>
                </Descriptions.Item>
                {selectedOrder.notes && (
                  <Descriptions.Item label="Notes" span={2}>
                    {selectedOrder.notes}
                  </Descriptions.Item>
                )}
              </Descriptions>

              <div>
                <Text strong className="block mb-3">Order Items:</Text>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, index) => (
                    <Card key={index} size="small" className="bg-slate-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <Text strong>{item.food_item_name}</Text>
                          <Text type="secondary" className="block text-xs">
                            ₹{item.price} × {item.quantity}
                          </Text>
                        </div>
                        <Text strong className="text-blue-600">
                          ₹{item.price * item.quantity}
                        </Text>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default StudentFoodMenu;