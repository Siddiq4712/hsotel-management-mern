import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, message, Modal, Form, Select, InputNumber,
  Tabs, Typography, Tag, Input, DatePicker, Row, Col, Statistic, Alert,
  Dropdown, Menu // NEW: Import Dropdown and Menu
} from 'antd';
import {
  PlusOutlined, WarningOutlined, DownloadOutlined,
  SearchOutlined, SyncOutlined, ArrowDownOutlined, InfoCircleOutlined, ShopOutlined, EditOutlined,
  DownOutlined // NEW: Import DownOutlined for the dropdown button
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;
const { RangePicker } = DatePicker;

const InventoryManagement = () => {
  // State variables (no changes here)
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addStockModalVisible, setAddStockModalVisible] = useState(false);
  const [bulkConsumeModalVisible, setBulkConsumeModalVisible] = useState(false);
  const [correctionModalVisible, setCorrectionModalVisible] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState(null);
  
  const [form] = Form.useForm();
  const [consumptionForm] = Form.useForm();
  const [correctionForm] = Form.useForm();

  const [confirmLoading, setConfirmLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().subtract(7, 'days'), moment()]);

  // Effects (no changes here)
  useEffect(() => {
    fetchAllInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === '2') {
      fetchTransactions();
    }
  }, [activeTab, dateRange]);
  
  // Data Fetching (no changes here)
  const fetchAllInitialData = () => {
    fetchInventory();
    fetchCategories();
    fetchItems();
    fetchStores();
  };
  
  const fetchAllData = () => {
    fetchInventory();
    fetchTransactions();
  }

  const fetchInventory = async () => {
    setLoading(true);
    try {
      // Assuming your API response for inventory includes 'last_bought_store_id'
      const response = await messAPI.getItemStock({ low_stock: lowStockOnly });
      setInventory(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch inventory data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await messAPI.getItemCategories();
      setCategories(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch categories.');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await messAPI.getItems();
      setItems(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch items.');
    }
  };

  const fetchStores = async () => {
    try {
      const response = await messAPI.getStores();
      setStores(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch stores.');
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
      const response = await messAPI.getInventoryTransactions(params);
      setTransactions(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch transaction history.');
    } finally {
      setTransactionLoading(false);
    }
  };

  // Modal Handlers (no changes here)
  const handleAddNewPurchase = () => {
    form.resetFields();
    setAddStockModalVisible(true);
  };

  const handleBulkConsumption = () => {
    consumptionForm.resetFields();
    setBulkConsumeModalVisible(true);
  };
  
  const handleOpenCorrectionModal = (record) => {
    setCorrectionRecord(record);
    correctionForm.setFieldsValue({
      quantity: record.quantity,
      unit_price: record.unit_price,
    });
    setCorrectionModalVisible(true);
  };

  // Form Submission Handlers (no changes here)
  const handleAddStockSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      const purchaseItem = {
        item_id: values.item_id,
        quantity: values.quantity,
        unit_price: values.unit_price,
        store_id: values.store_id,
        unit: items.find(i => i.id === values.item_id)?.UOM?.abbreviation || 'unit'
      };
      await messAPI.recordInventoryPurchase({ items: [purchaseItem] });
      message.success('New purchase recorded successfully');
      setAddStockModalVisible(false);
      fetchAllData();
    } catch (error) {
      message.error(`Failed to add stock: ${error.response?.data?.message || error.message}`);
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
        unit_id: items.find(i => i.id === item.item_id)?.unit_id || 1,
        consumption_date: values.consumption_date.format('YYYY-MM-DD'),
        meal_type: values.meal_type
      }));

      await messAPI.recordBulkConsumption({ consumptions: consumptionsToSubmit });
      message.success('Consumption recorded successfully');
      setBulkConsumeModalVisible(false);
      fetchAllData();
    } catch (error) {
      message.error(`Failed to record consumption: ${error.response?.data?.message || error.message}`);
    } finally {
      setConfirmLoading(false);
    }
  };
  
  const handleCorrectionSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      const payload = {
        item_id: correctionRecord.Item.id,
        new_quantity: values.quantity,
        new_unit_price: values.unit_price,
      };
      await messAPI.correctLastPurchase(payload);
      message.success('Last purchase corrected successfully');
      setCorrectionModalVisible(false);
      fetchAllData();
    } catch (error) {
      message.error(`Failed to correct purchase: ${error.response?.data?.message || error.message}`);
    } finally {
      setConfirmLoading(false);
    }
  };

  // Other Handlers (no changes here)
  const handleTabChange = (key) => setActiveTab(key);
  
  const handleLowStockFilterChange = (checked) => {
    setLowStockOnly(checked);
    setTimeout(fetchInventory, 0);
  };

  // MODIFIED: The handleExport function now accepts a storeId
  const handleExport = async (storeId = null) => {
    const storeName = storeId ? stores.find(s => s.id === storeId)?.name : 'All Stores';
    const exportKey = `export_${storeId || 'all'}`;
    message.loading({ content: `Generating report for ${storeName}...`, key: exportKey });

    try {
      // Base filter for items that have a purchase history
      let purchasableItems = inventory.filter(item => item.last_bought_store_name);

      // If a specific store is selected, filter further
      if (storeId) {
        // IMPORTANT: Assumes your inventory items have a `last_bought_store_id` property.
        // If not, you would filter by name: `item.last_bought_store_name === storeName`
        purchasableItems = purchasableItems.filter(item => item.last_bought_store_id === storeId);
      }

      if (purchasableItems.length === 0) {
        message.warn({ content: `No items with purchase history found for ${storeName}.`, key: exportKey, duration: 3 });
        return;
      }

      const formattedData = purchasableItems.map(item => ({
        'Item Name': item.Item?.name || 'N/A',
        'Supplier Name': item.last_bought_store_name,
        'Approval Qty': item.last_bought_qty,
        'RPU': item.last_bought_unit_price,
        'Cost Rs.': item.last_bought_overall_cost
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const totalCost = formattedData.reduce((sum, row) => sum + (Number(row['Cost Rs.']) || 0), 0);
      XLSX.utils.sheet_add_aoa(worksheet, [['', '', '', 'TOTAL', totalCost.toFixed(2)]], { origin: -1 });
      worksheet['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Last Purchase Report');
      
      const safeStoreName = storeName.replace(/\s+/g, '_');
      const fileName = `Purchase_Report_${safeStoreName}_${moment().format('YYYY-MM-DD')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      message.success({ content: 'Report downloaded successfully!', key: exportKey, duration: 2 });
    } catch (error) {
      message.error({ content: 'Failed to generate report.', key: exportKey, duration: 3 });
    }
  };

  // Table Columns (no changes here)
  const inventoryColumns = [
    { title: 'Item Name', dataIndex: ['Item', 'name'], key: 'name', sorter: (a, b) => (a.Item?.name || '').localeCompare(b.Item?.name || ''), render: (text, record) => (<div><Text strong>{text}</Text><br />{parseFloat(record.current_stock) <= parseFloat(record.minimum_stock) && (<Tag color="red" icon={<WarningOutlined />} style={{ marginTop: 4 }}>Low Stock</Tag>)}</div>) },
    { title: 'Category', dataIndex: ['Item', 'tbl_ItemCategory', 'name'], key: 'category' },
    { title: 'Current Stock', dataIndex: 'current_stock', key: 'current_stock', align: 'right', sorter: (a, b) => a.current_stock - b.current_stock, render: (text, record) => `${text} ${record.Item?.UOM?.abbreviation || 'units'}` },
    { title: 'Last Purchase', key: 'last_purchase', render: (_, record) => (record.last_bought_store_name ? (<div><Tag color="blue" icon={<ShopOutlined />}>{record.last_bought_store_name}</Tag><br /><Text type="secondary" style={{ fontSize: '12px' }}>Qty: {record.last_bought_qty} @ ₹{parseFloat(record.last_bought_unit_price).toFixed(2)}</Text></div>) : (<Text type="secondary">N/A</Text>)) },
    { title: 'Last Updated', dataIndex: 'last_updated', key: 'last_updated', render: text => moment(text).format('YYYY-MM-DD HH:mm'), sorter: (a, b) => moment(a.last_updated).unix() - moment(b.last_updated).unix() },
  ];

  const transactionColumns = [
    { title: 'Date', dataIndex: 'transaction_date', key: 'date', render: date => moment(date).format('YYYY-MM-DD'), sorter: (a, b) => moment(a.transaction_date).unix() - moment(b.transaction_date).unix() },
    { title: 'Item', dataIndex: ['Item', 'name'], key: 'item' },
    { title: 'Type', dataIndex: 'transaction_type', key: 'type', render: type => (<Tag color={type === 'purchase' ? 'green' : 'orange'}>{type.toUpperCase()}</Tag>), filters: [{ text: 'Purchase', value: 'purchase' }, { text: 'Consumption', value: 'consumption' }], onFilter: (value, record) => record.transaction_type === value },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', render: (qty, record) => `${qty} ${record.unit}` },
    { title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', render: price => `₹${parseFloat(price || 0).toFixed(2)}` },
    { title: 'Store', dataIndex: ['Store', 'name'], key: 'store', render: text => text || 'N/A' },
    { title: 'Actions', key: 'actions', render: (_, record) => {
      const latestPurchaseForItem = transactions.filter(t => t.Item.id === record.Item.id && t.transaction_type === 'purchase').sort((a, b) => moment(b.transaction_date).diff(moment(a.transaction_date)))[0];
      if (record.transaction_type === 'purchase' && record.id === latestPurchaseForItem?.id) {
        return (<Button icon={<EditOutlined />} size="small" onClick={() => handleOpenCorrectionModal(record)}>Correct</Button>);
      }
      return null;
    }},
  ];
  
  // Render Logic
  const lowStockCount = inventory.filter(item => parseFloat(item.current_stock) <= parseFloat(item.minimum_stock)).length;
  const filteredInventory = inventory.filter(item => item.Item?.name?.toLowerCase().includes(searchText.toLowerCase()));

  // NEW: Define the menu for the export dropdown
  const exportMenu = (
    <Menu onClick={({ key }) => handleExport(key === 'all' ? null : parseInt(key, 10))}>
      <Menu.Item key="all" icon={<DownloadOutlined />}>
        All Stores Report
      </Menu.Item>
      <Menu.Divider />
      {stores.length > 0 && <Menu.ItemGroup title="Reports by Store"></Menu.ItemGroup>}
      {stores.map(store => (
        <Menu.Item key={store.id} icon={<ShopOutlined />}>
          {store.name}
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <Card title="Inventory Management">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8} lg={6}><Statistic title="Total Items in Inventory" value={inventory.length} suffix="items" /></Col>
        <Col xs={24} md={8} lg={6}><Statistic title="Low Stock Items" value={lowStockCount} valueStyle={{ color: lowStockCount > 0 ? '#cf1322' : undefined }} prefix={lowStockCount > 0 && <WarningOutlined />} suffix="items" /></Col>
      </Row>

      {lowStockCount > 0 && (<Alert message="Low Stock Alert" description={`You have ${lowStockCount} items below their minimum stock level.`} type="warning" showIcon style={{ marginBottom: 16 }} />)}

      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="Current Inventory" key="1">
          <Space style={{ marginBottom: 16 }} wrap>
            <Input placeholder="Search items..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 200 }} prefix={<SearchOutlined />} allowClear />
            <Button onClick={() => handleLowStockFilterChange(!lowStockOnly)}>{lowStockOnly ? 'Show All' : 'Show Low Stock Only'}</Button>
            
            {/* MODIFIED: Replaced the old button with the new Dropdown */}
            <Dropdown overlay={exportMenu}>
              <Button>
                Export Report <DownOutlined />
              </Button>
            </Dropdown>
            
          </Space>
          <Table columns={inventoryColumns} dataSource={filteredInventory} rowKey="id" loading={loading} />
        </TabPane>
        
        <TabPane tab="Transaction History" key="2">
          <Space style={{ marginBottom: 16 }}>
            <RangePicker value={dateRange} onChange={setDateRange} />
            <Button type="primary" onClick={fetchTransactions} icon={<SyncOutlined />}>Refresh</Button>
          </Space>
          <Table columns={transactionColumns} dataSource={transactions} rowKey="id" loading={transactionLoading} />
        </TabPane>
      </Tabs>

      {/* MODALS (no changes here) */}
      <Modal title="Record New Purchase" visible={addStockModalVisible} onCancel={() => setAddStockModalVisible(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleAddStockSubmit}>
          <Form.Item name="item_id" label="Item" rules={[{ required: true }]}><Select placeholder="Select item" showSearch optionFilterProp="children">{items.map(item => (<Option key={item.id} value={item.id}>{item.name}</Option>))}</Select></Form.Item>
          <Form.Item name="store_id" label="Store" rules={[{ required: true }]}><Select placeholder="Select store" showSearch optionFilterProp="children">{stores.map(store => (<Option key={store.id} value={store.id}>{store.name}</Option>))}</Select></Form.Item>
          <Form.Item name="quantity" label="Quantity Purchased" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="unit_price" label="Unit Price (₹)" rules={[{ required: true }]}><InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} /></Form.Item>
          <Form.Item><Space><Button type="primary" htmlType="submit" loading={confirmLoading}>Save Purchase</Button><Button onClick={() => setAddStockModalVisible(false)}>Cancel</Button></Space></Form.Item>
        </Form>
      </Modal>
      
      <Modal title="Record Consumption" visible={bulkConsumeModalVisible} onCancel={() => setBulkConsumeModalVisible(false)} footer={null} width={700}>
        <Form form={consumptionForm} layout="vertical" onFinish={handleSubmitConsumption} initialValues={{ consumption_date: moment(), meal_type: 'lunch', items: [{}] }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="consumption_date" label="Consumption Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="meal_type" label="Meal Type" rules={[{ required: true }]}><Select><Option value="breakfast">Breakfast</Option><Option value="lunch">Lunch</Option><Option value="dinner">Dinner</Option><Option value="snacks">Snacks</Option></Select></Form.Item></Col>
          </Row>
          <Form.List name="items">
            {(fields, { add, remove }) => (<>
              {fields.map(({ key, name, ...restField }) => (<Row key={key} gutter={16} style={{ marginBottom: 8 }} align="middle">
                <Col span={12}><Form.Item {...restField} name={[name, 'item_id']} rules={[{ required: true }]} noStyle><Select placeholder="Select item" showSearch optionFilterProp="children">{items.map(item => (<Option key={item.id} value={item.id}>{item.name} ({item.UOM?.abbreviation || 'unit'})</Option>))}</Select></Form.Item></Col>
                <Col span={10}><Form.Item {...restField} name={[name, 'quantity']} rules={[{ required: true }]} noStyle><InputNumber placeholder="Quantity" style={{ width: '100%' }} min={0.01} step={0.1} /></Form.Item></Col>
                <Col span={2}>{fields.length > 1 && (<Button danger icon={<ArrowDownOutlined />} onClick={() => remove(name)} />)}</Col>
              </Row>))}
              <Form.Item><Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Item</Button></Form.Item>
            </>)}
          </Form.List>
          <Form.Item><Space><Button type="primary" htmlType="submit" loading={confirmLoading}>Record Consumption</Button><Button onClick={() => setBulkConsumeModalVisible(false)}>Cancel</Button></Space></Form.Item>
        </Form>
      </Modal>

      <Modal title="Correct Last Purchase" visible={correctionModalVisible} onCancel={() => setCorrectionModalVisible(false)} footer={null}>
        {correctionRecord && (
          <Form form={correctionForm} layout="vertical" onFinish={handleCorrectionSubmit}>
            <Typography.Title level={5}>{correctionRecord.Item.name}</Typography.Title>
            <Text type="secondary">Correcting purchase from {correctionRecord.Store.name} on {moment(correctionRecord.transaction_date).format('DD MMM YYYY')}</Text>
            <Row gutter={16} style={{ marginTop: 20 }}><Col span={12}><Statistic title="Original Quantity" value={correctionRecord.quantity} /></Col><Col span={12}><Statistic title="Original Unit Price" value={correctionRecord.unit_price} prefix="₹" precision={2} /></Col></Row>
            <Form.Item name="quantity" label="Corrected Quantity" rules={[{ required: true, message: 'Please enter the correct quantity' }]} style={{ marginTop: 20 }}><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="unit_price" label="Corrected Unit Price (₹)" rules={[{ required: true, message: 'Please enter the correct unit price' }]}><InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} /></Form.Item>
            <Alert message="Warning" description="This will update the last purchase record and adjust the total stock. This action cannot be undone." type="warning" showIcon style={{ marginBottom: 20 }}/>
            <Form.Item><Space><Button type="primary" htmlType="submit" loading={confirmLoading}>Apply Correction</Button><Button onClick={() => setCorrectionModalVisible(false)}>Cancel</Button></Space></Form.Item>
          </Form>
        )}
      </Modal>
    </Card>
  );
};

export default InventoryManagement;
