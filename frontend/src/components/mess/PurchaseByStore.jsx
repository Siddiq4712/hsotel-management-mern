import React, { useState, useEffect } from 'react';
import {
  Card, Button, message, Typography, Row, Col, 
  InputNumber, Form, Modal, Space, ConfigProvider,
  theme, Skeleton, Divider, Tag, Input, Table
} from 'antd';
import { 
  Store, Save, ArrowLeft, ShoppingCart, Info, 
  MapPin, ClipboardCheck 
} from 'lucide-react';
import api from '../../services/api';

const { Title, Text } = Typography;

// --- CSS Animation Injection (Option 3) ---
const SuccessStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .checkmark-circle {
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      stroke-width: 2;
      stroke-miterlimit: 10;
      stroke: #22c55e;
      fill: none;
      animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    }

    .checkmark {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: block;
      stroke-width: 2;
      stroke: #fff;
      stroke-miterlimit: 10;
      box-shadow: inset 0px 0px 0px #22c55e;
      animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
    }

    .checkmark-check {
      transform-origin: 50% 50%;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
    }

    @keyframes stroke { 100% { stroke-dashoffset: 0; } }
    @keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } }
    @keyframes fill { 100% { box-shadow: inset 0px 0px 0px 40px #22c55e; } }
    
    .fade-in-up {
      animation: fadeInUp 0.5s ease-out forwards;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `}} />
);

// --- Success Animation Overlay ---
const SuccessOverlay = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-md transition-all duration-500">
      <div className="flex flex-col items-center">
        <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
          <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </svg>
        <div className="text-center mt-6 fade-in-up" style={{ animationDelay: '0.8s' }}>
          <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Success!</Title>
          <Text className="text-slate-500 text-lg">Inventory updated and records saved.</Text>
        </div>
      </div>
    </div>
  );
};

// --- Specialized Skeleton for Store Selection ---
const StoreListSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="circle" size="large" />
          <div className="flex-1">
            <Skeleton active title={{ width: '30%' }} paragraph={{ rows: 1, width: '60%' }} />
          </div>
          <Skeleton.Button active style={{ width: 100 }} />
        </div>
      ))}
    </div>
  </Card>
);

const PurchaseByStore = () => {
  const [form] = Form.useForm();
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [itemsForStore, setItemsForStore] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [draft, setDraft] = useState({});
  const selectedItems = itemsForStore.filter(item => Number(draft[`quantity_${item.item_id}`]) > 0);
  const total = selectedItems.reduce((sum, item) => sum + Number(draft[`quantity_${item.item_id}`]) * Number(draft[`price_${item.item_id}`] || 0), 0);
  const visibleItems = itemsForStore.filter(item => `${item.name} ${item.tbl_ItemCategory?.name || ''}`.toLowerCase().includes(itemSearch.toLowerCase()));

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const response = await api.get('/mess/stores', { params: { is_active: true } });
      setStores(response.data.data);
    } catch (error) {
      message.error('Failed to fetch stores.');
    } finally {
      setLoadingStores(false);
    }
  };

  const handleSelectStore = async (store) => {
    setSelectedStore(store);
    setItemSearch('');
    setDraft({});
    setLoadingItems(true);
    setItemsForStore([]);
    form.resetFields();
    try {
      // Stores and items are chosen independently; mapping is not required.
      const response = await api.get('/mess/items');
      const items = (response.data.data || []).map(item => ({
        ...item,
        item_id: item.id,
        unit: item.UOM?.abbreviation || 'unit'
      }));
      const initialFormValues = {};
      items.forEach(item => {
        initialFormValues[`quantity_${item.item_id}`] = undefined;
        initialFormValues[`price_${item.item_id}`] = parseFloat(item.unit_price) || 0;
      });
      form.setFieldsValue(initialFormValues);
      setDraft(initialFormValues);
      setItemsForStore(items.map(item => ({
        ...item,
        unit: item.unit || 'unit'
      })));
    } catch (error) {
      message.error(`Failed to fetch items for ${store.name}.`);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleBackToStoreList = () => {
    setSelectedStore(null);
    setItemSearch('');
    setDraft({});
    setItemsForStore([]);
    form.resetFields();
  };

  const handleSubmitPurchases = async (values) => {
    values = { ...form.getFieldsValue(true), ...values };
    const purchasedItems = itemsForStore
      .filter(item => {
        const qty = values[`quantity_${item.item_id}`];
        return qty !== undefined && qty !== null && parseFloat(qty) > 0;
      })
      .map(item => ({
        item_id: item.item_id,
        store_id: selectedStore.id,
        quantity: parseFloat(values[`quantity_${item.item_id}`]),
        unit_price: parseFloat(values[`price_${item.item_id}`]),
        unit: item.unit,
        unit_id: item.unit_id
      }));

    if (purchasedItems.length === 0) {
      return message.warning('Please enter quantity for at least one item.');
    }

    Modal.confirm({
      title: 'Review purchase',
      icon: <ShoppingCart className="text-blue-600 mr-2" size={20} />,
      content: (
        <div className="mt-4">
          <Text type="secondary">Recording purchase for </Text>
          <Text strong className="text-blue-600">{selectedStore.name}</Text>
          <Divider className="my-3" />
          <div className="max-h-40 overflow-y-auto">
            {purchasedItems.map(item => (
              <div key={item.item_id} className="flex justify-between py-1">
                <Text size="small">{itemsForStore.find(i => i.item_id === item.item_id)?.name}</Text>
                <Text strong>{item.quantity} {item.unit}</Text>
              </div>
            ))}
          </div>
          <Divider className="my-3" />
          <Text strong>Total: ₹{purchasedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</Text>
        </div>
      ),
      okText: 'Confirm & Save',
      cancelText: 'Review',
      okButtonProps: { className: 'rounded-lg bg-blue-600' },
      onOk: async () => {
        setSubmitting(true);
        try {
          await api.post('/mess/inventory-purchase', { items: purchasedItems });
          
          // Trigger smooth success animation
          setShowSuccess(true);
          
          // Auto redirect after animation plays
          setTimeout(() => {
            setShowSuccess(false);
            handleBackToStoreList();
          }, 2600);

        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to submit purchases.');
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <SuccessStyles />
      <SuccessOverlay visible={showSuccess} />
      
      <div className="module-page p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
        {!selectedStore ? (
          <>
            <div className="module-page-heading flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                <Store className="text-white" size={24} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0 }}>Record Purchase</Title>
                <Text type="secondary">Choose a store, then enter quantities for the items you want to purchase.</Text>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {['1. Select a store', '2. Choose master items', '3. Review and save'].map(step => <div key={step} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600">{step}</div>)}
            </div>
            {!loadingStores && !stores.length && <Card><Title level={4}>No active stores</Title><Text type="secondary">Add or activate a store in Manage Stores to record a purchase.</Text></Card>}
            {loadingStores ? <StoreListSkeleton /> : (
              <Row gutter={[24, 24]}>
                {stores.map(store => (
                  <Col xs={24} sm={12} lg={8} key={store.id}>
                    <Card 
                      hoverable 
                      className="border-none shadow-sm rounded-[24px] overflow-hidden group transition-all"
                      onClick={() => handleSelectStore(store)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                          <Store size={24} className="text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <Tag color="blue" className="rounded-full border-none px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">Active Store</Tag>
                      </div>
                      <div className="mt-4">
                        <Title level={4} className="mb-1 text-slate-800">{store.name}</Title>
                        <div className="flex items-center gap-1 text-slate-400">
                          <MapPin size={14} />
                          <Text className="text-xs truncate">{store.address || 'Local Market'}</Text>
                        </div>
                      </div>
                      <Divider className="my-4 border-slate-50" />
                      <Button type="link" className="p-0 flex items-center gap-2 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
                        Select Store <ArrowLeft className="rotate-180" size={14} />
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="module-page-header flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Button 
                  icon={<ArrowLeft size={18} />} 
                  aria-label="Change store"
                  disabled={submitting}
                  onClick={handleBackToStoreList}
                  className="rounded-xl h-11 w-11 flex items-center justify-center border-none shadow-sm"
                />
                <div>
                  <Title level={2} style={{ margin: 0 }}>Purchase Items</Title>
                  <div className="flex items-center gap-2">
                    <Tag color="blue" className="rounded-full font-bold m-0">{selectedStore.name}</Tag>
                  </div>
                </div>
              </div>
              <Button 
                type="primary" 
                size="large" 
                onClick={() => form.submit()} 
                icon={<Save size={18} />} 
                loading={submitting}
                disabled={loadingItems || !itemsForStore.length}
                className="rounded-xl h-12 px-8 shadow-lg shadow-blue-100 font-bold"
              >
                Review & Save Purchase
              </Button>
            </div>

            <Card className="mb-6 rounded-2xl border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div><Text type="secondary">Selected store</Text><div className="font-semibold text-slate-800 mt-1">{selectedStore.name}</div><Text type="secondary">{selectedStore.address || 'Address not provided'}</Text></div>
                <div><Text type="secondary">Items to purchase</Text><div className="font-semibold text-2xl text-slate-800 mt-1">{selectedItems.length}</div></div>
                <div><Text type="secondary">Purchase total</Text><div className="font-semibold text-2xl text-blue-700 mt-1">₹{total.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</div></div>
              </div>
            </Card>
            {loadingItems ? <StoreListSkeleton /> : (
              itemsForStore.length > 0 ? (
                <Form form={form} onFinish={handleSubmitPurchases} onValuesChange={() => setDraft(form.getFieldsValue(true))} layout="vertical">
                  <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                      <div><Title level={4} style={{margin:'0 0 8px'}}>Item master</Title><Text type="secondary">Enter a quantity to include an item. Prices can be adjusted for this purchase.</Text></div>
                      <Input aria-label="Search master items" placeholder="Search item or category" allowClear value={itemSearch} onChange={event => setItemSearch(event.target.value)} size="large" style={{width:300,maxWidth:'100%'}} />
                    </div>
                    <Table
                      dataSource={visibleItems}
                      scroll={{x:650}}
                      locale={{emptyText: 'No items match your search.'}}
                      rowKey="item_id"
                      pagination={false}
                      columns={[
                        {
                          title: 'Master Item',
                          key: 'item',
                          render: (_, r) => (
                            <Space direction="vertical" size={0}>
                              <Text strong className="text-slate-700">{r.name}</Text>
                              <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                {r.tbl_ItemCategory?.name || 'Item'} · Unit: {r.unit}
                              </Text>
                            </Space>
                          )
                        },
                        {
                          title: <div className="text-right">Price (₹)</div>,
                          key: 'price',
                          align: 'right',
                          width: 180,
                          render: (_, r) => (
                            <Form.Item name={`price_${r.item_id}`} noStyle rules={[{ required: true }]}>
                              <InputNumber min={0} step={0.01} className="w-full rounded-xl" placeholder="0.00" prefix="₹" />
                            </Form.Item>
                          )
                        },
                        {
                          title: <div className="text-right">Quantity</div>,
                          key: 'quantity',
                          align: 'right',
                          width: 180,
                          render: (_, r) => (
                            <Form.Item name={`quantity_${r.item_id}`} noStyle>
                              <InputNumber min={0} className="w-full rounded-xl" placeholder="0" suffix={r.unit} />
                            </Form.Item>
                          )
                        },
                        {
                          title: 'Amount (₹)',
                          key: 'amount',
                          align: 'right',
                          width: 80,
                          render: (_, r) => <Text strong>{(Number(draft[`quantity_${r.item_id}`] || 0) * Number(draft[`price_${r.item_id}`] || 0)).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</Text>
                        }
                      ]}
                    />
                  </Card>
                </Form>
              ) : (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[40px] shadow-sm">
                  <div className="p-6 bg-slate-50 rounded-full mb-6">
                    <ClipboardCheck size={48} className="text-slate-200" />
                  </div>
                  <Title level={4} className="text-slate-800">No Master Items</Title>
                  <Text className="text-slate-500 text-center max-w-xs mb-8">
                    Add items in Manage Items before recording purchases.
                  </Text>

                </div>
              )
            )}
          </div>
        )}
      </div>
    </ConfigProvider>
  );
};

export default PurchaseByStore;