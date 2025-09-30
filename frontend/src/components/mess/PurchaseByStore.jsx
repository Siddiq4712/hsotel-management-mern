import React, { useState, useEffect } from 'react';
import {
  Card, Button, message, Typography, Row, Col, List,
  InputNumber, Form, Empty, Modal, Spin, Space
} from 'antd';

import { ShopOutlined, SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import api from '../../services/api';

const { Title, Text } = Typography;

const PurchaseByStore = () => {
  const [form] = Form.useForm();
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [itemsForStore, setItemsForStore] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      console.error("Error fetching stores:", error);
    } finally {
      setLoadingStores(false);
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
    const formattedItems = items.map(item => ({
      item_id: item.item_id,
      name: item.name,
      unit_price: item.unit_price,
      unit: item.unit || 'unit', // Ensure unit is included
      unit_id: item.unit_id // Optional: keep for reference
    }));
    setItemsForStore(formattedItems);
  } catch (error) {
    message.error(`Failed to fetch items for ${store.name}.`);
    setItemsForStore([]);
    console.error(`Error fetching items for store ${store.id}:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  } finally {
    setLoadingItems(false);
  }
};
  const handleBackToStoreList = () => {
    setSelectedStore(null);
    setItemsForStore([]);
    form.resetFields();
  };

  const handleSubmitPurchases = async (values) => {
  setSubmitting(true);
  console.log('[PurchaseByStore] Form Values:', values);

  const purchasedItems = itemsForStore
    .filter(item => {
      const quantity = values[`quantity_${item.item_id}`];
      console.log(`[DEBUG Filter] Item ID: ${item.item_id} (${typeof item.item_id}), Name: ${item.name}`);
      console.log(`[DEBUG Filter] Form Key: "quantity_${item.item_id}", Value from form: ${quantity} (${typeof quantity})`);
      const condition = quantity !== undefined && quantity !== null && parseFloat(quantity) > 0;
      console.log(`[DEBUG Filter] Condition (${quantity} > 0) evaluated to: ${condition}`);
      return condition;
    })
    .map(item => ({
      item_id: item.item_id,
      store_id: selectedStore.id,
      quantity: parseFloat(values[`quantity_${item.item_id}`]),
      unit_price: parseFloat(values[`price_${item.item_id}`]),
      unit: item.unit || 'unit' // Use unit abbreviation, fallback to 'unit'
    }));

  console.log('[PurchaseByStore] Filtered purchasedItems array to be sent to API:', purchasedItems);

  if (purchasedItems.length === 0) {
    message.warning('No items selected with valid quantities.');
    setSubmitting(false);
    return;
  }
  const onOk = async () => {
    console.log('[PurchaseByStore] Bypassing modal, sending API request:', { items: purchasedItems });
    try {
        const response = await api.post('/mess/inventory-purchase', { items: purchasedItems });
        console.log('[PurchaseByStore] API Success Response:', response.data);
        message.success(response.data.message || 'Purchases recorded successfully!');
        handleBackToStoreList();
    } catch (error) {
        console.error('[PurchaseByStore] API Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            request: error.request
        });
        message.error(error.response?.data?.message || 'Failed to submit purchases.');
    } finally {
        setSubmitting(false);
    }
};

onOk();

  Modal.confirm({
    title: 'Confirm Purchase',
    content: (
      <div>
        <p>Are you sure you want to submit the purchase for {selectedStore.name}?</p>
        <ul>
          {purchasedItems.map(item => (
            <li key={item.item_id}>
              Item ID: {item.item_id}, Quantity: {item.quantity}, Unit: {item.unit}, Unit Price: {item.unit_price}
            </li>
          ))}
        </ul>
      </div>
    ),
    onOk: async () => {
      console.log('[PurchaseByStore] Modal confirmed, sending API request:', { items: purchasedItems });
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout
        const response = await api.post(
          '/mess/inventory/purchase',
          { items: purchasedItems },
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        console.log('[PurchaseByStore] API Success Response:', response.data);
        message.success(response.data.message || 'Purchases recorded successfully!');
        handleBackToStoreList();
      } catch (error) {
        console.error('[PurchaseByStore] API Error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          request: error.request
        });
        if (error.name === 'AbortError') {
          message.error('Request timed out. Please try again or check the server.');
        } else {
          message.error(error.response?.data?.message || 'Failed to submit purchases.');
        }
      } finally {
        setSubmitting(false); // Ensure loading state is reset
      }
    },
    onCancel: () => {
      console.log('[PurchaseByStore] Modal cancelled');
      setSubmitting(false);
    }
  });
};
  if (!selectedStore) {
    return (
      <Card title="Record Purchase - Select a Store">
        {loadingStores ? <div style={{textAlign: 'center', padding: '40px 0'}}><Spin size="large"/></div> : (
          <List
            itemLayout="horizontal"
            dataSource={stores}
            renderItem={(store) => (
              <List.Item
                actions={[<Button type="primary" onClick={() => handleSelectStore(store)}>Select</Button>]}
              >
                <List.Item.Meta
                  avatar={<ShopOutlined style={{ fontSize: '24px' }} />}
                  title={<span className="font-semibold">{store.name}</span>}
                  description={store.address || 'No address provided'}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBackToStoreList} />
          <Title level={4} style={{ margin: 0 }}>
            New Purchase from: {selectedStore.name}
          </Title>
        </Space>
      }
    >
      {loadingItems ? <div style={{textAlign: 'center', padding: '40px 0'}}><Spin size="large"/></div> : (
        itemsForStore.length > 0 ? (
          <Form form={form} onFinish={handleSubmitPurchases} layout="vertical">
            <List
              header={
                <Row gutter={16} className="font-semibold text-gray-600">
                  <Col xs={24} sm={10}>Item</Col>
                  <Col xs={12} sm={7}>Price (per {itemsForStore[0]?.unit || 'unit'})</Col>
                  <Col xs={12} sm={7}>Quantity</Col>
                </Row>
              }
              itemLayout="horizontal"
              dataSource={itemsForStore}
              renderItem={(item) => (
                <List.Item>
                  <Row align="middle" gutter={16} style={{ width: '100%' }}>
                    <Col xs={24} sm={10}>
                      <Text strong>{item.name}</Text><br /><Text type="secondary">Unit: {item.unit}</Text>
                    </Col>
                    <Col xs={12} sm={7}>
                      <Form.Item name={`price_${item.item_id}`} noStyle rules={[{ required: true, message: 'Price is required' }]}>
                        <InputNumber min={0} step={0.50} style={{ width: '100%' }} stringMode />
                      </Form.Item>
                    </Col>
                    <Col xs={12} sm={7}>
                      <Form.Item name={`quantity_${item.item_id}`} noStyle>
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="Enter qty" />
                      </Form.Item>
                    </Col>
                  </Row>
                </List.Item>
              )}
            />
            <div style={{ textAlign: 'right', marginTop: '24px' }}>
              <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
                Save Purchases
              </Button>
            </div>
          </Form>
        ) : (
          <Empty description={<>No items are mapped to <strong>{selectedStore.name}</strong> yet. <br/> Go to 'Store Management' to map items to this store.</>} />
        )
      )}
    </Card>
  );
};

export default PurchaseByStore;
