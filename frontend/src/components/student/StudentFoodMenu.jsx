import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Button, Row, Col, List, message, Badge, Empty, 
  Input, Typography, Tag, Divider, ConfigProvider, theme, Form, Space,
  Skeleton, Table, DatePicker, Segmented, Modal, Descriptions
} from 'antd';
import {
  ShoppingCart, Plus, Minus, Coffee, 
  Info, Search, UtensilsCrossed, Send,
  History, ShoppingBag, Clock, CheckCircle2, 
  Truck, AlertTriangle, Eye, XCircle, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const StudentFoodMenu = () => {
  const [activeTab, setActiveTab] = useState('Menu');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [cartBump, setCartBump] = useState(false);

  // --- Data Fetching ---
  const fetchMenuData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getSpecialFoodItems({ is_available: true });
      setMenuItems(response.data.data);
      const uniqueCategories = [...new Set(response.data.data.map(item => item.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      message.error('Institutional menu sync failed.');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  const fetchOrderHistory = useCallback(async () => {
    setLoading(true);
    try {
      let params = {};
      if (dateRange?.[0] && dateRange?.[1]) {
        params = { 
            from_date: dateRange[0].format('YYYY-MM-DD'), 
            to_date: dateRange[1].format('YYYY-MM-DD') 
        };
      }
      const response = await studentAPI.getFoodOrders(params);
      if (response.data.success) setOrders(response.data.data);
    } catch (error) {
      message.error('Canteen logs could not be retrieved.');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 'Menu') fetchMenuData();
    else fetchOrderHistory();
  }, [activeTab, fetchMenuData, fetchOrderHistory]);

  // --- Menu Logic ---
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchTerm]);

  const handleAddToCart = (item) => {
    const newCart = { ...cart };
    if (newCart[item.id]) newCart[item.id].quantity += 1;
    else newCart[item.id] = { item: item, quantity: 1 };
    setCart(newCart);
    setCartBump(true);
    setTimeout(() => setCartBump(false), 300);
  };

  const handlePlaceOrder = async () => {
    if (Object.keys(cart).length === 0) return;
    setIsPlacingOrder(true);
    try {
      const orderData = {
        items: Object.values(cart).map(c => ({ food_item_id: c.item.id, quantity: c.quantity })),
        notes: orderNotes
      };
      await studentAPI.createFoodOrder(orderData);
      message.success('Order success! Settlement via monthly reconnaissance.');
      setCart({});
      setOrderNotes("");
      setActiveTab('History');
    } catch (error) {
      message.error('Order submission rejected.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // --- History Logic ---
  const handleCancelOrder = (id) => {
    Modal.confirm({
      title: 'Confirm Cancellation',
      icon: <AlertTriangle className="text-rose-500 mr-2" size={22} />,
      content: 'Void this institutional request?',
      okText: 'Yes, Void',
      okType: 'danger',
      centered: true,
      onOk: async () => {
        try {
          await studentAPI.cancelFoodOrder(id);
          message.success('Request voided');
          fetchOrderHistory();
        } catch (e) { message.error('Cancellation failed.'); }
      },
    });
  };

  const statusMap = {
    pending: { color: 'warning', icon: <Clock size={12} />, label: 'Requested' },
    confirmed: { color: 'blue', icon: <CheckCircle2 size={12} />, label: 'Confirmed' },
    preparing: { color: 'purple', icon: <UtensilsCrossed size={12} />, label: 'In Kitchen' },
    ready: { color: 'cyan', icon: <ShoppingBag size={12} />, label: 'At Counter' },
    delivered: { color: 'success', icon: <Truck size={12} />, label: 'Served' },
    cancelled: { color: 'error', icon: <XCircle size={12} />, label: 'Cancelled' }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <UtensilsCrossed className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Canteen Command</Title>
              <Text type="secondary">Institutional special menu and order history</Text>
            </div>
          </div>
          <Segmented
            size="large"
            className="p-1 rounded-2xl bg-white border border-slate-100 shadow-sm"
            options={[
              { label: <div className="flex items-center gap-2 px-4 py-1"><Coffee size={14}/> Menu</div>, value: 'Menu' },
              { label: <div className="flex items-center gap-2 px-4 py-1"><History size={14}/> History</div>, value: 'History' }
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'Menu' ? (
            <motion.div key="menu-tab" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Row gutter={[24, 24]}>
                <Col lg={16} xs={24}>
                  <div className="flex flex-wrap gap-4 items-center mb-8">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 h-12 w-full md:w-80">
                      <Search size={18} className="text-slate-400" />
                      <Input placeholder="Search dish..." bordered={false} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type={activeCategory === 'all' ? 'primary' : 'default'} onClick={() => setActiveCategory('all')} className="rounded-xl font-bold">All</Button>
                      {categories.map(cat => <Button key={cat} type={activeCategory === cat ? 'primary' : 'default'} onClick={() => setActiveCategory(cat)} className="rounded-xl font-bold capitalize">{cat}</Button>)}
                    </div>
                  </div>

                  {loading ? <Skeleton active paragraph={{ rows: 10 }} /> : (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                      <Row gutter={[16, 16]}>
                        {filteredMenuItems.map(item => (
                          <Col xs={24} sm={12} key={item.id}>
                            <motion.div variants={itemVariants} whileHover={{ y: -5 }}>
                              <Card className="border-none shadow-sm rounded-[32px] hover:shadow-xl transition-all h-full flex flex-col">
                                <Tag color="blue" className="rounded-full px-3 text-[9px] font-bold uppercase mb-2 border-none w-fit">{item.category}</Tag>
                                <Title level={4} className="m-0 mb-2">{item.name}</Title>
                                <Paragraph ellipsis={{ rows: 2 }} className="text-slate-400 text-xs mb-4">{item.description || 'Institutional quality prepared fresh.'}</Paragraph>
                                <div className="flex items-center justify-between mt-auto">
                                  <Text strong className="text-xl text-blue-600">₹{parseFloat(item.price).toFixed(2)}</Text>
                                  <motion.div whileTap={{ scale: 0.9 }}>
                                    <Button type="primary" icon={<Plus size={16}/>} className="rounded-xl h-10 px-6 font-bold" onClick={() => handleAddToCart(item)}>Add to Tray</Button>
                                  </motion.div>
                                </div>
                              </Card>
                            </motion.div>
                          </Col>
                        ))}
                      </Row>
                    </motion.div>
                  )}
                </Col>

                <Col lg={8} xs={24}>
                  <Card className="border-none shadow-sm rounded-[32px] sticky top-8" title={<div className="flex items-center gap-3"><ShoppingCart size={20} className="text-blue-600"/><Text strong>Your Tray</Text><motion.div animate={cartBump ? { scale: [1, 1.4, 1] } : {}}><Badge count={Object.keys(cart).length} color="#2563eb" /></motion.div></div>}>
                    <AnimatePresence mode='popLayout'>
                      {Object.keys(cart).length > 0 ? (
                        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                           <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                             {Object.values(cart).map(({ item, quantity }) => (
                               <motion.div layout key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <Text strong className="block truncate">{item.name}</Text>
                                    <Text className="text-[10px] text-slate-400">₹{parseFloat(item.price).toFixed(2)}</Text>
                                  </div>
                                  <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                                     <Button size="small" type="text" icon={<Minus size={12}/>} onClick={() => {
                                       const newCart = {...cart};
                                       if(newCart[item.id].quantity > 1) newCart[item.id].quantity -= 1;
                                       else delete newCart[item.id];
                                       setCart(newCart);
                                     }} />
                                     <Text strong className="px-3 text-sm">{quantity}</Text>
                                     <Button size="small" type="text" icon={<Plus size={12}/>} onClick={() => handleAddToCart(item)} />
                                  </div>
                               </motion.div>
                             ))}
                           </div>
                           <TextArea rows={2} placeholder="Instructions (e.g., No onions)..." className="rounded-xl" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} />
                           <Button type="primary" block size="large" icon={<Send size={18}/>} loading={isPlacingOrder} className="h-14 rounded-2xl shadow-xl shadow-blue-100 font-bold" onClick={handlePlaceOrder}>
                             Confirm Order (₹{Object.values(cart).reduce((sum, c) => sum + (parseFloat(c.item.price) * c.quantity), 0).toFixed(2)})
                           </Button>
                        </motion.div>
                      ) : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} className="py-12 text-center"><ShoppingCart size={40} className="mx-auto mb-2" /><Text>Tray empty</Text></motion.div>}
                    </AnimatePresence>
                  </Card>
                </Col>
              </Row>
            </motion.div>
          ) : (
            <motion.div key="history-tab" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <Card className="border-none shadow-sm rounded-2xl">
                <div className="flex flex-wrap gap-4 items-center">
                  <DatePicker.RangePicker value={dateRange} onChange={val => setDateRange(val)} className="flex-1 md:max-w-md h-11 rounded-xl" />
                  <Button type="primary" onClick={fetchOrderHistory} className="rounded-xl h-11 px-8 font-bold">Filter</Button>
                </div>
              </Card>
              <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                <Table 
                  dataSource={orders} 
                  rowKey="id" 
                  pagination={{ pageSize: 8 }}
                  columns={[
                    { title: 'Order ID', render: (_, r) => <div><Text strong>ORD-#{r.id}</Text><br/><Text className="text-[10px] text-slate-400">{moment(r.order_date).format('DD MMM, hh:mm A')}</Text></div> },
                    { title: 'Status', dataIndex: 'status', render: (s) => <Tag icon={statusMap[s]?.icon} color={statusMap[s]?.color} className="rounded-full font-bold uppercase text-[9px] border-none">{statusMap[s]?.label}</Tag> },
                    { title: 'Amount', dataIndex: 'total_amount', align: 'right', render: (amt) => <Text strong className="text-blue-600">₹{parseFloat(amt).toFixed(2)}</Text> },
                    { title: 'Actions', align: 'right', render: (_, r) => (
                      <Space>
                        <Button icon={<Eye size={14}/>} className="rounded-lg border-none bg-slate-100" onClick={() => { setSelectedOrder(r); setViewModalVisible(true); }} />
                        {r.status === 'pending' && <Button danger type="text" icon={<XCircle size={14}/>} onClick={() => handleCancelOrder(r.id)} />}
                      </Space>
                    )}
                  ]} 
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Modal title="Order Dossier" open={viewModalVisible} onCancel={() => setViewModalVisible(false)} footer={<Button type="primary" onClick={() => setViewModalVisible(false)} className="rounded-xl">Close</Button>} width={700} centered className="rounded-[32px]">
          {selectedOrder && (
            <div className="space-y-6 mt-4">
              <Descriptions bordered column={2} className="bg-slate-50 rounded-xl overflow-hidden">
                <Descriptions.Item label="Placed">{moment(selectedOrder.createdAt).format('LLL')}</Descriptions.Item>
                <Descriptions.Item label="Status"><Tag color={statusMap[selectedOrder.status].color}>{selectedOrder.status.toUpperCase()}</Tag></Descriptions.Item>
                <Descriptions.Item label="Notes" span={2}>{selectedOrder.notes || 'No specific instructions'}</Descriptions.Item>
              </Descriptions>
              <Table dataSource={selectedOrder.FoodOrderItems} pagination={false} size="small" columns={[
                { title: 'Item', dataIndex: ['SpecialFoodItem', 'name'], render: t => <Text strong>{t}</Text> },
                { title: 'Qty', dataIndex: 'quantity', align: 'center' },
                { title: 'Subtotal', dataIndex: 'subtotal', align: 'right', render: s => <Text className="text-blue-600">₹{parseFloat(s).toFixed(2)}</Text> }
              ]} />
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default StudentFoodMenu;