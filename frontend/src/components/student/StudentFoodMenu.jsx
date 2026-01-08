import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Button, Row, Col, List, message, Badge, Empty, 
  Input, Typography, Tag, Divider, ConfigProvider, theme, Form, Space,
  Skeleton, Table, DatePicker, Segmented, Modal, Descriptions, Tooltip
} from 'antd';
import {
  ShoppingCart, Plus, Minus, Coffee, 
  Info, Search, UtensilsCrossed, Send,
  History, ShoppingBag, Clock, CheckCircle2, 
  Truck, AlertTriangle, Eye, XCircle, Inbox,
  LayoutGrid, AlignJustify, List as ListIcon, Maximize, Square,
  Hash, ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const StudentFoodMenu = () => {
  const [activeTab, setActiveTab] = useState('Menu');
  const [viewMode, setViewMode] = useState('tiles'); // 'icons' | 'tiles' | 'list' | 'details' | 'content'
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

  // --- Logic ---
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

  // --- View Renderers ---

  // 1. ICONS VIEW (Large square visuals)
  const renderIconsView = () => (
    <Row gutter={[16, 16]}>
      {filteredMenuItems.map(item => (
        <Col xs={12} sm={8} md={6} key={item.id}>
          <div 
            className="group bg-white p-6 rounded-3xl border border-transparent hover:border-blue-200 hover:shadow-xl transition-all flex flex-col items-center text-center cursor-pointer relative"
            onClick={() => handleAddToCart(item)}
          >
            <div className="p-5 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mb-4">
              <UtensilsCrossed size={48} strokeWidth={1} />
            </div>
            <Text strong className="block truncate w-full mb-1">{item.name}</Text>
            <Text className="text-blue-600 font-bold">₹{item.price}</Text>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button type="primary" shape="circle" icon={<Plus size={14}/>} size="small" />
            </div>
          </div>
        </Col>
      ))}
    </Row>
  );

  // 2. TILES VIEW (Standard card view)
  const renderTilesView = () => (
    <Row gutter={[16, 16]}>
      {filteredMenuItems.map(item => (
        <Col xs={24} sm={12} key={item.id}>
          <Card className="border-none shadow-sm rounded-[24px] hover:shadow-md transition-all h-full border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Tag color="blue" className="rounded-full px-2 text-[9px] font-bold uppercase border-none mb-1">{item.category}</Tag>
                <Title level={5} className="m-0">{item.name}</Title>
              </div>
              <Text strong className="text-lg text-blue-600">₹{item.price}</Text>
            </div>
            <div className="flex items-center justify-between">
              <Paragraph ellipsis={{ rows: 1 }} className="text-slate-400 text-xs m-0 flex-1">{item.description || 'Institutional special'}</Paragraph>
              <Button type="primary" size="small" icon={<Plus size={14}/>} onClick={() => handleAddToCart(item)} className="rounded-lg ml-2" />
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  // 3. LIST VIEW (High density compact rows)
  const renderListView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {filteredMenuItems.map((item, idx) => (
        <div key={item.id} className={`flex items-center justify-between p-4 hover:bg-blue-50/50 transition-colors ${idx !== filteredMenuItems.length - 1 ? 'border-b border-slate-50' : ''}`}>
           <Space size={16} className="flex-1">
              <Coffee size={18} className="text-slate-300" />
              <div className="min-w-[150px]"><Text strong>{item.name}</Text></div>
              <Tag className="rounded-full border-none bg-slate-100 text-slate-500 text-[10px] px-3">{item.category.toUpperCase()}</Tag>
           </Space>
           <Space size={24}>
             <Text strong className="text-blue-600 w-16 text-right">₹{item.price}</Text>
             <Button type="text" icon={<Plus size={16} className="text-blue-600"/>} onClick={() => handleAddToCart(item)} />
           </Space>
        </div>
      ))}
    </div>
  );

  // 4. DETAILS VIEW (Table format)
  const renderDetailsView = () => (
    <Table 
      dataSource={filteredMenuItems}
      rowKey="id"
      pagination={false}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      columns={[
        { title: 'Dish Name', dataIndex: 'name', render: (t) => <Text strong>{t}</Text> },
        { title: 'Category', dataIndex: 'category', render: (c) => <Tag className="rounded-full capitalize">{c}</Tag> },
        { title: 'Description', dataIndex: 'description', ellipsis: true, className: 'text-slate-400 text-xs' },
        { title: 'Price', dataIndex: 'price', align: 'right', render: (p) => <Text strong className="text-blue-600">₹{p}</Text> },
        { title: '', align: 'right', render: (_, r) => <Button type="primary" ghost size="small" icon={<Plus size={14}/>} onClick={() => handleAddToCart(r)}>Add</Button> }
      ]}
    />
  );

  // 5. CONTENT VIEW (Large descriptive blocks)
  const renderContentView = () => (
    <div className="space-y-4">
      {filteredMenuItems.map(item => (
        <Card key={item.id} className="border-none shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
          <Row gutter={24} align="middle">
            <Col md={4} className="flex justify-center border-r border-slate-50">
               <div className="p-8 bg-slate-50 rounded-full text-blue-500">
                  <UtensilsCrossed size={48} strokeWidth={1} />
               </div>
            </Col>
            <Col md={14}>
               <div className="flex items-center gap-3 mb-1">
                 <Title level={4} style={{ margin: 0 }}>{item.name}</Title>
                 <Tag color="blue">{item.category}</Tag>
               </div>
               <Paragraph className="text-slate-500 m-0 leading-relaxed font-light italic">
                 "{item.description || 'Our chefs prepare this institutional special daily using fresh ingredients and traditional recipes.'}"
               </Paragraph>
            </Col>
            <Col md={6} className="text-right">
               <div className="flex flex-col gap-2 p-4">
                 <Text strong className="text-2xl text-blue-600 block mb-2">₹{item.price}</Text>
                 <Button type="primary" block size="large" className="rounded-xl font-bold" onClick={() => handleAddToCart(item)}>Place on Tray</Button>
               </div>
            </Col>
          </Row>
        </Card>
      ))}
    </div>
  );
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
          fetchOrderHistory(); // Refresh the history list
        } catch (e) { 
          message.error('Cancellation failed.'); 
        }
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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 rotate-3">
              <UtensilsCrossed className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Canteen Command</Title>
              <Text type="secondary" className="font-light">Manage your nutrition and institutional food requests</Text>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            <Segmented
              size="large"
              options={[
                { label: <div className="flex items-center gap-2 px-3"><Coffee size={14}/> Menu</div>, value: 'Menu' },
                { label: <div className="flex items-center gap-2 px-3"><History size={14}/> Orders</div>, value: 'History' }
              ]}
              value={activeTab}
              onChange={setActiveTab}
              className="bg-slate-50 p-1 rounded-xl"
            />
            {activeTab === 'Menu' && (
              <>
                <Divider type="vertical" className="h-8" />
                <Segmented
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { label: <Tooltip title="Icons"><Square size={14} className="mt-1.5 mx-auto"/></Tooltip>, value: 'icons' },
                    { label: <Tooltip title="Tiles"><LayoutGrid size={14} className="mt-1.5 mx-auto"/></Tooltip>, value: 'tiles' },
                    { label: <Tooltip title="List"><AlignJustify size={14} className="mt-1.5 mx-auto"/></Tooltip>, value: 'list' },
                    { label: <Tooltip title="Details"><ListIcon size={14} className="mt-1.5 mx-auto"/></Tooltip>, value: 'details' },
                    { label: <Tooltip title="Content"><Maximize size={14} className="mt-1.5 mx-auto"/></Tooltip>, value: 'content' },
                  ]}
                  className="bg-slate-100 p-1 rounded-xl"
                />
              </>
            )}
          </div>
        </div>

        {activeTab === 'Menu' ? (
          <Row gutter={[24, 24]}>
            <Col lg={16} xs={24}>
              {/* Search & Filters */}
              <div className="flex flex-wrap gap-4 items-center mb-6">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 h-12 w-full md:w-72">
                  <Search size={18} className="text-slate-400" />
                  <Input placeholder="Search dish..." bordered={false} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type={activeCategory === 'all' ? 'primary' : 'default'} onClick={() => setActiveCategory('all')} className="rounded-xl font-bold h-10 px-6">All</Button>
                  {categories.map(cat => (
                    <Button key={cat} type={activeCategory === cat ? 'primary' : 'default'} onClick={() => setActiveCategory(cat)} className="rounded-xl font-bold h-10 px-6 capitalize">{cat}</Button>
                  ))}
                </div>
              </div>

              {loading ? <Skeleton active paragraph={{ rows: 8 }} className="bg-white p-8 rounded-3xl" /> : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {filteredMenuItems.length === 0 ? (
                    <Empty className="py-20 bg-white rounded-3xl" description="No matching dishes found in registry." />
                  ) : (
                    <>
                      {viewMode === 'icons' && renderIconsView()}
                      {viewMode === 'tiles' && renderTilesView()}
                      {viewMode === 'list' && renderListView()}
                      {viewMode === 'details' && renderDetailsView()}
                      {viewMode === 'content' && renderContentView()}
                    </>
                  )}
                </div>
              )}
            </Col>

            <Col lg={8} xs={24}>
              {/* Tray Sidebar */}
              <Card className="border-none shadow-sm rounded-[32px] sticky top-8" 
                title={
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <ShoppingCart size={20} className="text-blue-600"/>
                      <Text strong>Your Tray</Text>
                    </div>
                    <motion.div animate={cartBump ? { scale: [1, 1.4, 1] } : {}}>
                      <Badge count={Object.keys(cart).length} color="#2563eb" />
                    </motion.div>
                  </div>
                }
              >
                {Object.keys(cart).length > 0 ? (
                  <div className="space-y-6">
                     <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {Object.values(cart).map(({ item, quantity }) => (
                         <div key={item.id} className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0">
                            <div className="flex-1 min-w-0 pr-4">
                              <Text strong className="block truncate">{item.name}</Text>
                              <Text className="text-[10px] text-slate-400 font-bold">UNIT: ₹{item.price}</Text>
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
                         </div>
                       ))}
                     </div>
                     <div className="pt-4 border-t border-slate-100">
                        <div className="flex justify-between mb-4">
                          <Text type="secondary">Total Settlement</Text>
                          <Text strong className="text-xl">₹{Object.values(cart).reduce((sum, c) => sum + (parseFloat(c.item.price) * c.quantity), 0).toFixed(2)}</Text>
                        </div>
                        <TextArea rows={2} placeholder="Add specific cooking instructions..." className="rounded-xl mb-4 bg-slate-50 border-none p-3" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} />
                        <Button type="primary" block size="large" icon={<Send size={18}/>} loading={isPlacingOrder} className="h-14 rounded-2xl shadow-xl shadow-blue-100 font-bold border-none" onClick={handlePlaceOrder}>
                          Confirm & Post Order
                        </Button>
                     </div>
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-20">
                    <ShoppingCart size={64} className="mx-auto mb-4" />
                    <Text className="block">Tray is currently empty</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        ) : (
          /* History View */
          <div className="animate-in fade-in duration-500 space-y-6">
            <Card className="border-none shadow-sm rounded-2xl">
              <div className="flex flex-wrap gap-4 items-center">
                <DatePicker.RangePicker value={dateRange} onChange={val => setDateRange(val)} className="flex-1 md:max-w-md h-12 rounded-xl" />
                <Button type="primary" icon={<Search size={16}/>} onClick={fetchOrderHistory} className="rounded-xl h-12 px-8 font-bold">Filter Registry</Button>
              </div>
            </Card>
            
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
              <Table 
                dataSource={orders} 
                rowKey="id" 
                pagination={{ pageSize: 10 }}
                columns={[
                  { 
                    title: 'Dossier #', 
                    render: (_, r) => (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Hash size={14}/></div>
                        <div>
                          <Text strong className="text-slate-700">ORD-{r.id}</Text>
                          <div className="text-[10px] text-slate-400">{moment(r.order_date).format('DD MMM, hh:mm A')}</div>
                        </div>
                      </div>
                    ) 
                  },
                  { 
                    title: 'Current Status', 
                    dataIndex: 'status', 
                    render: (s) => (
                      <Tag icon={statusMap[s]?.icon} color={statusMap[s]?.color} className="rounded-full font-bold uppercase text-[9px] border-none px-3 py-0.5">
                        {statusMap[s]?.label}
                      </Tag>
                    ) 
                  },
                  { 
                    title: 'Settlement', 
                    dataIndex: 'total_amount', 
                    align: 'right', 
                    render: (amt) => <Text strong className="text-blue-600">₹{parseFloat(amt).toFixed(2)}</Text> 
                  },
                  { 
                    title: 'Actions', 
                    align: 'right', 
                    render: (_, r) => (
                      <Space>
                        <Tooltip title="View Details">
                          <Button icon={<Eye size={14}/>} className="rounded-lg border-none bg-slate-100" onClick={() => { setSelectedOrder(r); setViewModalVisible(true); }} />
                        </Tooltip>
                        {r.status === 'pending' && (
                          <Tooltip title="Cancel Order">
                            <Button danger type="text" icon={<XCircle size={14}/>} onClick={() => handleCancelOrder(r.id)} />
                          </Tooltip>
                        )}
                      </Space>
                    ) 
                  }
                ]} 
              />
            </Card>
          </div>
        )}

        {/* Details Modal */}
        <Modal 
          title={<div className="flex items-center gap-2 text-blue-600"><ClipboardList size={20}/> Order Dossier</div>} 
          open={viewModalVisible} 
          onCancel={() => setViewModalVisible(false)} 
          footer={<Button type="primary" onClick={() => setViewModalVisible(false)} className="h-11 rounded-xl px-8">Dismiss</Button>} 
          width={700} 
          centered 
          className="rounded-[32px] overflow-hidden"
        >
          {selectedOrder && (
            <div className="space-y-6 mt-4">
              <Descriptions bordered column={2} className="bg-slate-50 rounded-2xl overflow-hidden" size="small">
                <Descriptions.Item label="Placed On">{moment(selectedOrder.createdAt).format('LLL')}</Descriptions.Item>
                <Descriptions.Item label="Registry Status"><Tag color={statusMap[selectedOrder.status].color}>{selectedOrder.status.toUpperCase()}</Tag></Descriptions.Item>
                <Descriptions.Item label="Notes" span={2}>{selectedOrder.notes || 'No specific institutional instructions provided.'}</Descriptions.Item>
              </Descriptions>
              
              <Table 
                dataSource={selectedOrder.FoodOrderItems} 
                pagination={false} 
                size="small" 
                className="border border-slate-100 rounded-xl overflow-hidden"
                columns={[
                  { title: 'Item Detail', dataIndex: ['SpecialFoodItem', 'name'], render: t => <Text strong>{t}</Text> },
                  { title: 'Quantity', dataIndex: 'quantity', align: 'center', render: q => <Badge count={q} color="#94a3b8" /> },
                  { title: 'Subtotal', dataIndex: 'subtotal', align: 'right', render: s => <Text className="text-blue-600 font-bold">₹{parseFloat(s).toFixed(2)}</Text> }
                ]} 
              />
              
              <div className="flex justify-end p-4 bg-blue-50 rounded-2xl">
                 <Space size={12}>
                   <Text type="secondary">Total Value:</Text>
                   <Text strong className="text-2xl text-blue-600">₹{parseFloat(selectedOrder.total_amount).toFixed(2)}</Text>
                 </Space>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default StudentFoodMenu;