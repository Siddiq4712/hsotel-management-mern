import React, { useState, useEffect } from 'react';
import {
  Card, Button, message, Typography, Row, Col, 
  InputNumber, Form, Modal, Space, ConfigProvider,
  theme, Skeleton, Divider, Tag, Tooltip, Table
} from 'antd';
import { 
  Store, Save, ArrowLeft, ShoppingCart, Info, 
  MapPin, ClipboardCheck, History 
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

const PurchaseByStore = ({ setCurrentView }) => {
  const [form] = Form.useForm();
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [itemsForStore, setItemsForStore] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
      setTimeout(() => setLoadingStores(false), 800);
    }
  };

  const handleSelectStore = async (store) => {
    setSelectedStore(store);
    setLoadingItems(true);
    try {
      const response = await api.get(`/mess/stores/${store.id}/items`);
      const items = response.data.data;
      const initialFormValues = {};
      items.forEach(item => {
        initialFormValues[`quantity_${item.item_id}`] = undefined;
        initialFormValues[`price_${item.item_id}`] = parseFloat(item.unit_price) || 0;
      });
      form.setFieldsValue(initialFormValues);
      setItemsForStore(items.map(item => ({
        ...item,
        unit: item.unit || 'unit'
      })));
    } catch (error) {
      message.error(`Failed to fetch items for ${store.name}.`);
    } finally {
      setTimeout(() => setLoadingItems(false), 600);
    }
  };

  const handleBackToStoreList = () => {
    setSelectedStore(null);
    setItemsForStore([]);
    form.resetFields();
  };

  const handleSubmitPurchases = async (values) => {
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
        unit: item.unit
      }));

    if (purchasedItems.length === 0) {
      return message.warning('Please enter quantity for at least one item.');
    }

    Modal.confirm({
      title: 'Confirm Procurement',
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
      
      <div className="p-8 bg-slate-50 min-h-screen">
        {!selectedStore ? (
          <>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                <Store className="text-white" size={24} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0 }}>Record Purchase</Title>
                <Text type="secondary">Select a store to start recording new inventory batches</Text>
              </div>
            </div>

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
                        <Tag color="blue" className="rounded-full border-none px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">Active Supplier</Tag>
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
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <Button 
                  icon={<ArrowLeft size={18} />} 
                  onClick={handleBackToStoreList}
                  className="rounded-xl h-11 w-11 flex items-center justify-center border-none shadow-sm"
                />
                <div>
                  <Title level={2} style={{ margin: 0 }}>Procurement Entry</Title>
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
                className="rounded-xl h-12 px-8 shadow-lg shadow-blue-100 font-bold"
              >
                Save Purchases
              </Button>
            </div>

            {loadingItems ? <StoreListSkeleton /> : (
              itemsForStore.length > 0 ? (
                <Form form={form} onFinish={handleSubmitPurchases} layout="vertical">
                  <Card className="border-none shadow-sm rounded-[32px] overflow-hidden p-2">
                    <Table
                      dataSource={itemsForStore}
                      rowKey="item_id"
                      pagination={false}
                      columns={[
                        {
                          title: 'Item Information',
                          key: 'item',
                          render: (_, r) => (
                            <Space direction="vertical" size={0}>
                              <Text strong className="text-slate-700">{r.name}</Text>
                              <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                Standard Unit: {r.unit}
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
                              <InputNumber min={0} step={0.5} className="w-full rounded-xl" placeholder="0.00" prefix="₹" />
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
                          title: '',
                          key: 'status',
                          width: 80,
                          render: () => (
                            <Tooltip title="Historical Price Info">
                              <Button type="text" icon={<History size={16} className="text-slate-300" />} />
                            </Tooltip>
                          )
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
                  <Title level={4} className="text-slate-800">No Mapped Items</Title>
                  <Text className="text-slate-500 text-center max-w-xs mb-8">
                    This supplier doesn't have any items mapped yet.
                  </Text>
                  <Button 
                    type="primary" 
                    className="rounded-xl h-11 px-8"
                    onClick={() => setCurrentView('item-store-mapping')}
                  >
                    Go to Mapping
                  </Button>
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