import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Select, InputNumber, message, Modal,
  Form, Switch, Popconfirm, Tag, Tabs, Typography, Input
} from 'antd';
import {
  PlusOutlined, LinkOutlined, ShopOutlined, TagOutlined,
  DeleteOutlined, SearchOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;

const ItemStoreMapping = () => {
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [itemStores, setItemStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    fetchItems();
    fetchStores();
    fetchItemStores();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await messAPI.getItems();
      setItems(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch items');
    }
  };

  const fetchStores = async () => {
    try {
      const response = await messAPI.getStores();
      setStores(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch stores');
    }
  };

  const fetchItemStores = async () => {
    setLoading(true);
    try {
      let params = {};
      if (selectedItem) params.item_id = selectedItem;
      if (selectedStore) params.store_id = selectedStore;
      
      const response = await messAPI.getItemStores(params);
      setItemStores(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch item-store mappings');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemsByStore = async (storeId) => {
    if (!storeId) return;
    setLoading(true);
    try {
      const response = await messAPI.getItemsByStoreId(storeId);
      // In a real implementation, you'd use this data
      // For now, we'll just show a message
      message.info(`Fetched ${response.data.data?.length || 0} items from store`);
    } catch (error) {
      message.error('Failed to fetch items by store');
    } finally {
      setLoading(false);
    }
  };

  const fetchStoresByItem = async (itemId) => {
    if (!itemId) return;
    setLoading(true);
    try {
      const response = await messAPI.getStoresByItemId(itemId);
      // In a real implementation, you'd use this data
      // For now, we'll just show a message
      message.info(`Fetched ${response.data.data?.length || 0} stores for item`);
    } catch (error) {
      message.error('Failed to fetch stores by item');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await messAPI.removeItemStoreMapping(id);
      message.success('Mapping removed successfully');
      fetchItemStores();
    } catch (error) {
      message.error('Failed to remove mapping');
    }
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      await messAPI.mapItemToStore(values);
      message.success('Item mapped to store successfully');
      setModalVisible(false);
      fetchItemStores();
    } catch (error) {
      message.error('Failed to map item to store');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleFilterChange = () => {
    fetchItemStores();
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const columns = [
    {
      title: 'Item',
      dataIndex: ['Item', 'name'],
      key: 'item',
      render: (text) => text || 'N/A',
      sorter: (a, b) => (a.Item?.name || '').localeCompare(b.Item?.name || ''),
    },
    {
      title: 'Category',
      dataIndex: ['Item', 'tbl_ItemCategory', 'name'],
      key: 'category',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Store',
      dataIndex: ['Store', 'name'],
      key: 'store',
      render: (text) => text || 'N/A',
      sorter: (a, b) => (a.Store?.name || '').localeCompare(b.Store?.name || ''),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => (price ? `₹${parseFloat(price).toFixed(2)}` : 'N/A'),
      sorter: (a, b) => (a.price || 0) - (b.price || 0),
    },
    {
      title: 'Preferred',
      dataIndex: 'is_preferred',
      key: 'preferred',
      render: (isPreferred) => (
        isPreferred ? <Tag color="green">Preferred</Tag> : 'No'
      ),
      filters: [
        { text: 'Preferred', value: true },
        { text: 'Not Preferred', value: false }
      ],
      onFilter: (value, record) => record.is_preferred === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Are you sure you want to remove this mapping?"
          onConfirm={() => handleDelete(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button 
            icon={<DeleteOutlined />} 
            danger 
            size="small"
          />
        </Popconfirm>
      ),
    },
  ];

  const storeColumns = [
    {
      title: 'Store Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Contact',
      dataIndex: 'contact_number',
      key: 'contact',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (active) => (
        active ? 
          <Tag color="green">Active</Tag> : 
          <Tag color="red">Inactive</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          icon={<SearchOutlined />} 
          onClick={() => fetchItemsByStore(record.id)}
          size="small"
        >
          View Items
        </Button>
      ),
    },
  ];

  const itemColumns = [
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Category',
      dataIndex: ['tbl_ItemCategory', 'name'],
      key: 'category',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Unit',
      dataIndex: ['UOM', 'abbreviation'],
      key: 'unit',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'price',
      render: (price) => `₹${parseFloat(price || 0).toFixed(2)}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          icon={<SearchOutlined />} 
          onClick={() => fetchStoresByItem(record.id)}
          size="small"
        >
          View Stores
        </Button>
      ),
    },
  ];

  return (
    <Card title="Item-Store Mapping">
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="Mappings" key="1">
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="Filter by item"
              style={{ width: 200 }}
              allowClear
              onChange={(value) => {
                setSelectedItem(value);
                setTimeout(handleFilterChange, 0);
              }}
              showSearch
              optionFilterProp="children"
            >
              {items.map(item => (
                <Option key={item.id} value={item.id}>{item.name}</Option>
              ))}
            </Select>

            <Select
              placeholder="Filter by store"
              style={{ width: 200 }}
              allowClear
              onChange={(value) => {
                setSelectedStore(value);
                setTimeout(handleFilterChange, 0);
              }}
            >
              {stores.map(store => (
                <Option key={store.id} value={store.id}>{store.name}</Option>
              ))}
            </Select>

            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreate}
            >
              Add Mapping
            </Button>
          </Space>

          <Table
            columns={columns}
            dataSource={itemStores}
            rowKey="id"
            loading={loading}
          />
        </TabPane>

        <TabPane tab="Stores" key="2">
          <Table
            columns={storeColumns}
            dataSource={stores}
            rowKey="id"
          />
        </TabPane>

        <TabPane tab="Items" key="3">
          <Table
            columns={itemColumns}
            dataSource={items}
            rowKey="id"
          />
        </TabPane>
      </Tabs>

      <Modal
        title="Map Item to Store"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="item_id"
            label="Item"
            rules={[{ required: true, message: 'Please select an item' }]}
          >
            <Select
              placeholder="Select item"
              showSearch
              optionFilterProp="children"
            >
              {items.map(item => (
                <Option key={item.id} value={item.id}>{item.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="store_id"
            label="Store"
            rules={[{ required: true, message: 'Please select a store' }]}
          >
            <Select
              placeholder="Select store"
              showSearch
              optionFilterProp="children"
            >
              {stores.map(store => (
                <Option key={store.id} value={store.id}>{store.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="price"
            label="Price (₹)"
            rules={[{ required: true, message: 'Please enter price' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="is_preferred"
            label="Preferred"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={confirmLoading}>
                Save Mapping
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ItemStoreMapping;
