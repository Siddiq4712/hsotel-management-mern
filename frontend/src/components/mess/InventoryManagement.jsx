import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, message, Modal, Form, Select, InputNumber,
  Tabs, Typography, Tag, Input, DatePicker, Row, Col, Statistic, Alert
} from 'antd';
import {
  PlusOutlined, WarningOutlined, DownloadOutlined,
  SearchOutlined, SyncOutlined, ArrowDownOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [bulkConsumeModalVisible, setBulkConsumeModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [consumptionForm] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().subtract(7, 'days'), moment()]);

  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchItems();
  }, []);

  useEffect(() => {
    if (activeTab === '2') {
      fetchTransactions();
    }
  }, [activeTab]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (lowStockOnly) params.low_stock = true;
      
      const response = await messAPI.getItemStock(params);
      setInventory(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await messAPI.getItemCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch categories');
    }
  };

  const fetchItems = async () => {
    try {
      const params = {};
      if (selectedCategory !== 'all') params.category_id = selectedCategory;
      if (searchText) params.search = searchText;
      
      const response = await messAPI.getItems(params);
      setItems(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch items');
    }
  };

  const fetchTransactions = async () => {
    setTransactionLoading(true);
    try {
      const params = {};
      
      if (dateRange && dateRange.length === 2) {
        params.from_date = dateRange[0].format('YYYY-MM-DD');
        params.to_date = dateRange[1].format('YYYY-MM-DD');
      }
      
      // We're not handling transactions in the simplified API, but we can mock this
      // In a real app, this would call messAPI.getInventoryTransactions(params);
      setTransactions([]);
    } catch (error) {
      message.error('Failed to fetch transactions');
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleUpdateStock = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleBulkConsumption = () => {
    consumptionForm.resetFields();
    setBulkConsumeModalVisible(true);
  };

  const handleSubmitStockUpdate = async (values) => {
    setConfirmLoading(true);
    try {
      const payload = {
        item_id: values.item_id,
        hostel_id: 1, // Adjust based on your auth context or user data
        quantity: values.current_stock, // Send as quantity for backend
        unit_price: values.unit_price,
        purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : undefined,
      };
      await messAPI.updateItemStock(payload);
      message.success('Stock updated successfully');
      setModalVisible(false);
      fetchInventory();
    } catch (error) {
      message.error('Failed to update stock: ' + (error.response?.data?.message || error.message));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSubmitConsumption = async (values) => {
    setConfirmLoading(true);
    try {
      const consumptionsToSubmit = values.items.map(item => ({
        item_id: item.item_id,
        quantity_consumed: item.quantity,
        unit: getUnitForItem(item.item_id),
        consumption_date: values.consumption_date.format('YYYY-MM-DD'),
        meal_type: values.meal_type
      }));

      await messAPI.recordBulkConsumption({ consumptions: consumptionsToSubmit });
      message.success('Consumption recorded successfully');
      setBulkConsumeModalVisible(false);
      fetchInventory();
    } catch (error) {
      message.error('Failed to record consumption: ' + (error.response?.data?.message || error.message));
    } finally {
      setConfirmLoading(false);
    }
  };

  const getUnitForItem = (itemId) => {
    const item = items.find(i => i.id === itemId);
    return item?.UOM?.abbreviation || 'unit';
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handleLowStockFilterChange = (checked) => {
    setLowStockOnly(checked);
    setTimeout(fetchInventory, 0);
  };

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  const handleSearch = () => {
    fetchItems();
  };

  const handleExportInventory = () => {
    try {
      const formattedData = inventory.map((stock, index) => ({
        'S.No': index + 1,
        'Item Name': stock.Item?.name || 'Unknown',
        'Category': stock.Item?.tbl_ItemCategory?.name || 'N/A',
        'Current Stock': stock.current_stock,
        'Unit': stock.Item?.UOM?.abbreviation || 'unit',
        'Min. Stock': stock.minimum_stock,
        'Status': parseFloat(stock.current_stock) <= parseFloat(stock.minimum_stock) ? 'Low Stock' : 'Adequate',
        'Last Updated': moment(stock.last_updated).format('YYYY-MM-DD HH:mm')
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

      const cols = Object.keys(formattedData[0] || {});
      worksheet['!cols'] = cols.map(col => ({
        wch: Math.max(...formattedData.map(row => (row[col] ? row[col].toString().length : 0)), col.length),
      }));

      const fileName = `Inventory_Report_${moment().format('YYYY-MM-DD')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      message.success('Inventory report downloaded successfully');
    } catch (error) {
      message.error('Failed to export inventory: ' + error.message);
    }
  };

  const columns = [
    {
      title: 'Item Name',
      dataIndex: ['Item', 'name'],
      key: 'name',
      sorter: (a, b) => (a.Item?.name || '').localeCompare(b.Item?.name || ''),
      render: (text, record) => (
        <Space>
          {text}
          {parseFloat(record.current_stock) <= parseFloat(record.minimum_stock) && (
            <Tag color="red" icon={<WarningOutlined />}>Low Stock</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: ['Item', 'tbl_ItemCategory', 'name'],
      key: 'category',
      render: text => text || 'N/A',
      filters: categories.map(cat => ({ text: cat.name, value: cat.id })),
      onFilter: (value, record) => record.Item?.category_id === value,
    },
    {
      title: 'Current Stock',
      dataIndex: 'current_stock',
      key: 'current_stock',
      sorter: (a, b) => a.current_stock - b.current_stock,
      render: (text, record) => `${text} ${record.Item?.UOM?.abbreviation || 'units'}`
    },
    {
      title: 'Minimum Stock',
      dataIndex: 'minimum_stock',
      key: 'minimum_stock',
    },
    {
      title: 'Last Updated',
      dataIndex: 'last_updated',
      key: 'last_updated',
      render: text => moment(text).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => moment(a.last_updated).unix() - moment(b.last_updated).unix(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            const item = items.find(i => i.id === record.item_id);
            form.setFieldsValue({
              item_id: record.item_id,
              current_stock: record.current_stock,
              minimum_stock: record.minimum_stock,
              unit_price: item?.unit_price || 0, // Pre-fill from Item
              purchase_date: moment(), // Default to today
            });
            setModalVisible(true);
          }}
        >
          Update Stock
        </Button>
      ),
    },
  ];

  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'transaction_date',
      key: 'date',
      render: date => moment(date).format('YYYY-MM-DD'),
      sorter: (a, b) => moment(a.transaction_date).unix() - moment(b.transaction_date).unix()
    },
    {
      title: 'Item',
      dataIndex: ['Item', 'name'],
      key: 'item',
      render: text => text || 'N/A'
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type',
      key: 'type',
      render: type => (
        <Tag color={type === 'purchase' ? 'green' : 'orange'}>
          {type.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Purchase', value: 'purchase' },
        { text: 'Consumption', value: 'consumption' }
      ],
      onFilter: (value, record) => record.transaction_type === value,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty, record) => `${qty} ${record.unit}`,
      sorter: (a, b) => a.quantity - b.quantity
    },
    {
      title: 'Store',
      dataIndex: ['Store', 'name'],
      key: 'store',
      render: text => text || 'N/A'
    },
    {
      title: 'Recorded By',
      dataIndex: ['RecordedBy', 'username'],
      key: 'recorded_by',
      render: text => text || 'System'
    }
  ];

  const lowStockCount = inventory.filter(item => 
    parseFloat(item.current_stock) <= parseFloat(item.minimum_stock)
  ).length;

  return (
    <Card title="Inventory Management">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8} lg={6}>
          <Statistic
            title="Total Items in Inventory"
            value={inventory.length}
            suffix="items"
          />
        </Col>
        <Col xs={24} md={8} lg={6}>
          <Statistic
            title="Low Stock Items"
            value={lowStockCount}
            valueStyle={{ color: lowStockCount > 0 ? '#cf1322' : undefined }}
            prefix={lowStockCount > 0 && <WarningOutlined />}
            suffix="items"
          />
        </Col>
      </Row>

      {lowStockCount > 0 && (
        <Alert
          message="Low Stock Alert"
          description={`You have ${lowStockCount} items that are below their minimum stock levels.`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="Current Inventory" key="1">
          <Space style={{ marginBottom: 16 }} wrap>
            <Input
              placeholder="Search items"
              allowClear
              value={searchText}
              onChange={handleSearchChange}
              onPressEnter={handleSearch}
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
            />
            
            <Select
              placeholder="Filter by category"
              style={{ width: 200 }}
              value={selectedCategory}
              onChange={(value) => {
                setSelectedCategory(value);
                setTimeout(fetchItems, 0);
              }}
              allowClear
            >
              <Option value="all">All Categories</Option>
              {categories.map(category => (
                <Option key={category.id} value={category.id}>{category.name}</Option>
              ))}
            </Select>
            
            <Button onClick={() => handleLowStockFilterChange(!lowStockOnly)}>
              {lowStockOnly ? 'Show All' : 'Show Low Stock Only'}
            </Button>
            
            <Button type="primary" onClick={handleUpdateStock}>
              Update Stock
            </Button>
            
            <Button onClick={handleBulkConsumption}>
              Record Consumption
            </Button>
            
            <Button icon={<DownloadOutlined />} onClick={handleExportInventory}>
              Export
            </Button>
          </Space>
          
          <Table
            columns={columns}
            dataSource={inventory}
            rowKey="id"
            loading={loading}
          />
        </TabPane>
        
        <TabPane tab="Transaction History" key="2">
          <Space style={{ marginBottom: 16 }}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
            />
            
            <Button type="primary" onClick={fetchTransactions} icon={<SearchOutlined />}>
              Search
            </Button>
          </Space>
          
          <Table
            columns={transactionColumns}
            dataSource={transactions}
            rowKey="id"
            loading={transactionLoading}
          />
        </TabPane>
      </Tabs>

      {/* Stock Update Modal */}
      <Modal
        title="Update Stock"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        confirmLoading={confirmLoading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitStockUpdate}
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
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {items.map(item => (
                <Option key={item.id} value={item.id}>{item.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="current_stock"
            label="Current Stock"
            rules={[{ required: true, message: 'Please enter current stock' }]}
            tooltip={{ title: 'Set the total stock level for this item', icon: <InfoCircleOutlined /> }}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="minimum_stock"
            label="Minimum Stock"
            rules={[{ required: true, message: 'Please enter minimum stock' }]}
            tooltip={{ title: 'When stock falls below this level, the item will be flagged as low stock', icon: <InfoCircleOutlined /> }}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="unit_price"
            label="Unit Price (₹)"
            rules={[{ required: true, message: 'Please enter unit price' }]}
            tooltip={{ title: 'Price per unit for this stock batch', icon: <InfoCircleOutlined /> }}
          >
            <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="Enter unit price" />
          </Form.Item>

          <Form.Item
            name="purchase_date"
            label="Purchase Date"
            tooltip={{ title: 'Date when this stock was purchased (optional)', icon: <InfoCircleOutlined /> }}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={confirmLoading}>
                Update
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Consumption Modal */}
      <Modal
        title="Record Consumption"
        visible={bulkConsumeModalVisible}
        onCancel={() => setBulkConsumeModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={consumptionForm}
          layout="vertical"
          onFinish={handleSubmitConsumption}
          initialValues={{
            consumption_date: moment(),
            meal_type: 'lunch',
            items: [{}]
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="consumption_date"
                label="Consumption Date"
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="meal_type"
                label="Meal Type"
                rules={[{ required: true, message: 'Please select meal type' }]}
              >
                <Select>
                  <Option value="breakfast">Breakfast</Option>
                  <Option value="lunch">Lunch</Option>
                  <Option value="dinner">Dinner</Option>
                  <Option value="snacks">Snacks</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Row key={key} gutter={16} style={{ marginBottom: 8 }}>
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        name={[name, 'item_id']}
                        rules={[{ required: true, message: 'Select item' }]}
                      >
                        <Select
                          placeholder="Select item"
                          showSearch
                          optionFilterProp="children"
                        >
                          {items.map(item => (
                            <Option key={item.id} value={item.id}>
                              {item.name} ({item.UOM?.abbreviation || 'unit'})
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Enter quantity' }]}
                      >
                        <InputNumber 
                          placeholder="Quantity" 
                          style={{ width: '100%' }} 
                          min={0.01} 
                          step={0.1} 
                        />
                      </Form.Item>
                    </Col>
                    
                    <Col span={2}>
                      {fields.length > 1 ? (
                        <Button 
                          danger 
                          icon={<ArrowDownOutlined />} 
                          onClick={() => remove(name)} 
                        />
                      ) : null}
                    </Col>
                  </Row>
                ))}
                
                <Form.Item>
                  <Button 
                    type="dashed" 
                    onClick={() => add()} 
                    block 
                    icon={<PlusOutlined />}
                  >
                    Add Item
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={confirmLoading}>
                Record Consumption
              </Button>
              <Button onClick={() => setBulkConsumeModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default InventoryManagement;