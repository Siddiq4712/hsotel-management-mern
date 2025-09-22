import React, { useState, useEffect } from 'react';
import {
  Card, Button, message, Typography, Row, Col, List,
  Avatar, InputNumber, Form, Empty, Modal, Spin, Space
} from 'antd';

// Ant Design icons
import { ShopOutlined, SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";

// Lucide icons
import { Store, ShoppingCart, ShoppingBag } from "lucide-react";

import api from '../../services/api'; // Assuming your api.js is in src/services

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
      // Your api.js uses a different structure, let's adapt
      // We assume `messAPI` is not exported, but the base `api` is.
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
    setLoadingItems(true);
    try {
      const response = await api.get(`/mess/stores/${store.id}/items`);
      const initialFormValues = {};
      response.data.data.forEach(item => {
        initialFormValues[`quantity_${item.item_id}`] = undefined;
        initialFormValues[`price_${item.item_id}`] = item.unit_price;
      });
      form.setFieldsValue(initialFormValues);
      setItemsForStore(response.data.data);
    } catch (error) {
      message.error(`Failed to fetch items for ${store.name}.`);
      setItemsForStore([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleBackToStoreList = () => {
    setSelectedStore(null);
    setItemsForStore([]);
    form.resetFields();
  };

  const handleSubmitPurchases = (values) => {
    const purchasedItems = itemsForStore
      .filter(item => values[`quantity_${item.item_id}`] > 0)
      .map(item => ({
        item_id: item.item_id,
        store_id: selectedStore.id,
        quantity: values[`quantity_${item.item_id}`],
        unit_price: values[`price_${item.item_id}`],
        unit: item.unit,
      }));

    if (purchasedItems.length === 0) {
      message.warning('No items were entered for purchase.');
      return;
    }

    Modal.confirm({
      title: 'Confirm Purchases',
      content: `Record ${purchasedItems.length} item(s) purchased from ${selectedStore.name}? This will update your inventory.`,
      onOk: async () => {
        setSubmitting(true);
        try {
          await api.post('/mess/inventory/purchases', { items: purchasedItems });
          message.success('Purchases recorded successfully!');
          handleBackToStoreList();
        } catch (error) {
          message.error('Failed to submit purchases.');
        } finally {
          setSubmitting(false);
        }
      },
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
                  avatar={<ShopOutlined />}
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
          <Form form={form} onFinish={handleSubmitPurchases}>
            <List
              header={<Row gutter={16} className="font-semibold text-gray-600"><Col xs={24} sm={10}>Item</Col><Col xs={12} sm={7}>Price (₹)</Col><Col xs={12} sm={7}>Quantity</Col></Row>}
              itemLayout="horizontal"
              dataSource={itemsForStore}
              renderItem={(item) => (
                <List.Item>
                  <Row align="middle" gutter={16} style={{ width: '100%' }}>
                    <Col xs={24} sm={10}>
                      <Text strong>{item.name}</Text><br /><Text type="secondary">Unit: {item.unit}</Text>
                    </Col>
                    <Col xs={12} sm={7}>
                      <Form.Item name={`price_${item.item_id}`} noStyle rules={[{ required: true }]}>
                        <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
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
            <div className="text-right mt-6">
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
