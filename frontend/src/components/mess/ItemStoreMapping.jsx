import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Select, InputNumber, message, Modal,
  Form, Switch, Popconfirm, Tag, Tabs, Typography, Input, Row, Col
} from 'antd';
import {
  PlusOutlined, DownloadOutlined, DeleteOutlined, SearchOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import * as XLSX from 'xlsx';

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
      const store_id = values.store_id;
      const mappings = values.items || [];
      for (const mapping of mappings) {
        await messAPI.mapItemToStore({
          item_id: mapping.item_id,
          store_id,
          price: mapping.price,
          is_preferred: mapping.is_preferred || false,
        });
      }
      message.success(`${mappings.length} items mapped to store successfully`);
      setModalVisible(false);
      fetchItemStores();
    } catch (error) {
      message.error('Failed to create mappings');
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

  // --- NEW: handleExportExcel function ---
  const handleExportExcel = () => {
    if (itemStores.length === 0) {
      message.warning('No data to export.');
      return;
    }

    // Map the itemStores data to the desired Excel structure
    const exportData = itemStores.map(mapping => ({
      'Item Name': mapping.Item?.name || 'N/A',
      'Common Store Name': mapping.Store?.name || 'N/A',
      // Qty and Overall Cost are not available in the ItemStore mapping data
      // They would typically come from a purchase/inventory transaction record.
      'Qty': '', 
      'Unit Price': parseFloat(mapping.price || 0).toFixed(2),
      'Overall Cost': '', 
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ItemStoreMappings');
    XLSX.writeFile(workbook, 'ItemStoreMappings.xlsx');
    message.success('Data exported to Excel successfully!');
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
            
            {/* --- NEW: Export to Excel Button --- */}
            <Button 
              type="default" // Using 'default' type for a secondary action
              icon={<DownloadOutlined />} 
              onClick={handleExportExcel}
              style={{ marginLeft: 8 }} // Add some spacing
            >
              Export to Excel
            </Button>
            {/* --- END NEW --- */}

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
        title="Map Multiple Items to Store"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={1000}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ store_id: undefined, items: [{}] }} // Start with one empty item row
        >
          {/* Store Selection - Single at the top */}
          <Form.Item
            name="store_id"
            label="Select Store"
            rules={[{ required: true, message: 'Please select a store' }]}
          >
            <Select
              placeholder="Choose a store to map items to"
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {stores.map(store => (
                <Option key={store.id} value={store.id}>{store.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Text type="secondary" style={{ marginBottom: 16 }}>
            Select the store above, then add items below. All selected items will be mapped to this store.
          </Text>
          
          {/* Items Form.List */}
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card key={key} style={{ marginBottom: 16 }} size="small">
                    <Row gutter={16} align="middle">
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'item_id']}
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
                      </Col>
                      <Col span={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'price']}
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
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'is_preferred']}
                          label="Preferred"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col span={7} style={{ display: 'flex', alignItems: 'center' }}>
                        <Text type="secondary">This item will be mapped to the selected store above.</Text>
                      </Col>
                      <Col span={0} style={{ textAlign: 'right' }}>
                        <Popconfirm title="Remove this item row?" onConfirm={() => remove(name)}>
                          <DeleteOutlined style={{ color: 'red', fontSize: 16, cursor: 'pointer' }} />
                        </Popconfirm>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Another Item
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Row justify="end" style={{ marginTop: 16 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={confirmLoading}>
                Save All Mappings to Store
              </Button>
            </Space>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};

export default ItemStoreMapping;