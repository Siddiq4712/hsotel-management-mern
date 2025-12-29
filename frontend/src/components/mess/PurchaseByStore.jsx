import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Button, message, Typography, Row, Col, List,
  InputNumber, Form, Empty, Modal, Spin, Space, ConfigProvider,
  theme, Skeleton, Divider, Tag, Tooltip, Table
} from 'antd';
import { 
  Store, Save, ArrowLeft, ShoppingCart, Info, 
  MapPin, ClipboardCheck, History, Search 
} from 'lucide-react';
import api from '../../services/api';

const { Title, Text } = Typography;

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
  const [searchText, setSearchText] = useState('');

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
      cancelButtonProps: { className: 'rounded-lg' },
      onOk: async () => {
        setSubmitting(true);
        try {
          const response = await api.post('/mess/inventory-purchase', { items: purchasedItems });
          message.success(response.data.message || 'Inventory updated successfully!');
          handleBackToStoreList();
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to submit purchases.');
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  // --- View: Store Selection ---
  if (!selectedStore) {
    return (
      <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
        <div className="p-8 bg-slate-50 min-h-screen">
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
        </div>
      </ConfigProvider>
    );
  }

  // --- View: Item Purchase Entry ---
  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
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
                <Text type="secondary">Sourcing from:</Text>
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
          <div className="max-w-6xl mx-auto">
            {itemsForStore.length > 0 ? (
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
                          <Form.Item 
                            name={`price_${r.item_id}`} 
                            noStyle 
                            rules={[{ required: true, message: 'Required' }]}
                          >
                            <InputNumber 
                              min={0} 
                              step={0.5} 
                              className="w-full rounded-xl" 
                              placeholder="0.00"
                              prefix="₹"
                            />
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
                            <InputNumber 
                              min={0} 
                              className="w-full rounded-xl" 
                              placeholder="0"
                              suffix={r.unit}
                            />
                          </Form.Item>
                        )
                      },
                      {
                        title: '',
                        key: 'status',
                        width: 80,
                        render: (_, r) => (
                          <Tooltip title="Historical Price Info">
                            <Button type="text" icon={<History size={16} className="text-slate-300" />} />
                          </Tooltip>
                        )
                      }
                    ]}
                  />
                  <div className="p-6 bg-slate-50/50 flex items-center justify-between mt-4 rounded-2xl border border-dashed border-slate-200">
                    <div className="flex items-center gap-3">
                      <Info className="text-blue-500" size={20} />
                      <Text className="text-slate-500 text-sm italic">
                        Items shown are based on the mapping for <strong>{selectedStore.name}</strong>.
                      </Text>
                    </div>
                  </div>
                </Card>
              </Form>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[40px] shadow-sm">
                <div className="p-6 bg-slate-50 rounded-full mb-6">
                  <ClipboardCheck size={48} className="text-slate-200" />
                </div>
                <Title level={4} className="text-slate-800">No Mapped Items</Title>
                <Text className="text-slate-500 text-center max-w-xs mb-8">
                  This supplier doesn't have any items mapped yet. Please update the store mapping.
                </Text>
                <Button type="primary" className="rounded-xl h-11 px-8">Go to Mapping</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </ConfigProvider>
  );
};

export default PurchaseByStore;