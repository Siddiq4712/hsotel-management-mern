import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, message, Modal, Form, Select, InputNumber,
  Tabs, Typography, Tag, Input, DatePicker, Row, Col, Statistic, Alert,
  Dropdown, Menu
} from 'antd';
import {
  PlusOutlined, WarningOutlined, DownloadOutlined,
  SearchOutlined, SyncOutlined, ArrowDownOutlined, ShopOutlined, EditOutlined,
  DownOutlined
} from '@ant-design/icons';
import { messAPI } from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;
const { RangePicker } = DatePicker;

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [correctionModalVisible, setCorrectionModalVisible] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState(null);
  const [correctionForm] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment()]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAllInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === '2') {
      fetchTransactions();
    }
  }, [activeTab, dateRange]);
  
  const fetchAllInitialData = () => {
    fetchInventory();
    fetchStores();
  };
  
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await messAPI.getItemStock({ low_stock: lowStockOnly });
      setInventory(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch inventory data.');
    } finally {
      setLoading(false);
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

  const handleOpenCorrectionModal = (record) => {
    setCorrectionRecord(record);
    correctionForm.setFieldsValue({ quantity: record.quantity, unit_price: record.unit_price });
    setCorrectionModalVisible(true);
  };

  const handleCorrectionSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      const payload = { item_id: correctionRecord.Item.id, new_quantity: values.quantity, new_unit_price: values.unit_price };
      await messAPI.correctLastPurchase(payload);
      message.success('Last purchase corrected successfully');
      setCorrectionModalVisible(false);
      fetchInventory();
      fetchTransactions();
    } catch (error) {
      message.error(`Failed to correct purchase: ${error.response?.data?.message || error.message}`);
    } finally {
      setConfirmLoading(false);
    }
  };
  
  const handleTabChange = (key) => setActiveTab(key);
  
  const handleLowStockFilterChange = (checked) => {
    setLowStockOnly(checked);
    setTimeout(fetchInventory, 0);
  };

  const handleExportLastPurchase = async (storeId = null) => {
    // This function for the simple "Last Purchase" report remains unchanged.
    const storeName = storeId ? stores.find(s => s.id === storeId)?.name : 'All Stores';
    message.loading({ content: `Generating report for ${storeName}...`, key: `export_${storeId}` });
    
    let itemsToExport = inventory.filter(item => item.last_bought_store_name);
    if (storeId) {
      itemsToExport = itemsToExport.filter(item => item.last_bought_store_id === storeId);
    }

    if (itemsToExport.length === 0) {
      message.warn({ content: `No items with purchase history found for ${storeName}.`, key: `export_${storeId}` });
      return;
    }

    const formattedData = itemsToExport.map(item => ({
      'Item Name': item.Item?.name || 'N/A', 'Supplier Name': item.last_bought_store_name, 'Approval Qty': item.last_bought_qty,
      'RPU': item.last_bought_unit_price, 'Cost Rs.': item.last_bought_overall_cost
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const totalCost = formattedData.reduce((sum, row) => sum + (Number(row['Cost Rs.']) || 0), 0);
    XLSX.utils.sheet_add_aoa(worksheet, [['', '', '', 'TOTAL', totalCost.toFixed(2)]], { origin: -1 });
    worksheet['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Last Purchase Report');
    const fileName = `Last_Purchase_Report_${storeName.replace(/\s+/g, '_')}_${moment().format('YYYY-MM-DD')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    message.success({ content: 'Report downloaded successfully!', key: `export_${storeId}` });
  };
  
  /**
   * IMPLEMENTED: The logic for vertical grouping, centering supplier name, and merging the TOTAL row
   * to align the label to the bottom-right of the item block is implemented here.
   */
  const handleExportPurchaseDetails = async () => {
    setExporting(true);
    message.loading({ content: 'Generating detailed purchase report...', key: 'export_details', duration: 0 });

    try {
        const params = {};
        if (dateRange && dateRange.length === 2) {
            params.from_date = dateRange[0].format('YYYY-MM-DD');
            params.to_date = dateRange[1].format('YYYY-MM-DD');
        }
        
        // Fetch all purchase transactions for the date range
        const response = await messAPI.getInventoryTransactions({ 
            ...params, 
            transaction_type: 'purchase', 
        });
        const purchases = response.data.data || [];

        if (purchases.length === 0) {
            message.warn({ content: 'No purchase data found for the selected date range.', key: 'export_details' });
            setExporting(false);
            return;
        }
        
        // Group transactions by Store
        const groupedByStore = purchases.reduce((acc, p) => {
            // Use Store name as the key
            const storeName = p.Store?.name || 'Unknown Store';
            if (!acc[storeName]) acc[storeName] = [];
            acc[storeName].push(p);
            return acc;
        }, {});
        
        // Data structure for XLSX AOA (Array of Arrays)
        let excelDataArray = [
            ['Item Name', 'Supplier Name', 'Qty', 'Rate', 'Amount'] // Header Row (Row 0)
        ];
        
        const merges = [];
        let netTotal = 0;
        let currentRow = 1; // Start after header (Row 1 for the first item)

        for (const [storeName, items] of Object.entries(groupedByStore)) {
            let storeTotal = 0;
            const startRow = currentRow; // Row index where the store's items start

            const storeItemRows = items.map(item => {
                const quantity = parseFloat(item.quantity) || 0;
                const unitPrice = parseFloat(item.unit_price) || 0;
                const amount = quantity * unitPrice;
                storeTotal += amount;
                
                // Format Item Name like "CLEANING POWDER EXO (1 Kg Pkt)"
                const itemName = `${item.Item?.name || 'N/A'} (Per ${item.unit || 'Unit'})`;
                
                return [
                    itemName,
                    '', // Placeholder for merged store name
                    quantity,
                    unitPrice,
                    parseFloat(amount).toFixed(2) // Ensure amount is formatted as a string
                ];
            });
            
            excelDataArray.push(...storeItemRows);
            
            // 1. Store Name Merge (Column B)
            const endRow = startRow + items.length - 1;
            merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } }); 
            
            // Set the store name in the middle row of the merged block for vertical alignment
            const storeNameRowIndex = startRow + Math.floor((endRow - startRow) / 2);
            excelDataArray[storeNameRowIndex][1] = { 
                v: storeName, 
                s: { 
                    alignment: { vertical: 'center', horizontal: 'center' }, 
                    font: { bold: true } 
                } 
            };
            
            // 2. Add Store Total Row
            // The TOTAL text should be in column D, merging with C and B. The amount is in E.
            excelDataArray.push(['', '', '', 'TOTAL', parseFloat(storeTotal).toFixed(2)]);
            netTotal += storeTotal;
            
            // Prepare for Total Merge (columns B, C, D) - to align 'TOTAL' text to the bottom right of the table
            const totalRowIndex = currentRow + items.length;
            merges.push({ s: { r: totalRowIndex, c: 1 }, e: { r: totalRowIndex, c: 3 } }); // Merge B to D
            
            // Update currentRow to the next starting point (after the total row)
            currentRow = totalRowIndex + 1;
        }
        
        // 3. Add Net Total Row
        excelDataArray.push(['', '', '', 'NET TOTAL', parseFloat(netTotal).toFixed(2)]);
        
        // Prepare for Net Total Merge (columns B, C, D)
        const netTotalRowIndex = currentRow;
        merges.push({ s: { r: netTotalRowIndex, c: 1 }, e: { r: netTotalRowIndex, c: 3 } });

        // --- Finalizing and Exporting ---
        const worksheet = XLSX.utils.aoa_to_sheet(excelDataArray);
        
        // Apply Merges
        worksheet['!merges'] = merges;
        
        // Apply Column Widths
        worksheet['!cols'] = [
            { wch: 40 }, // A: Item Name
            { wch: 25 }, // B: Supplier Name
            { wch: 15 }, // C: Qty
            { wch: 15 }, // D: Rate
            { wch: 20 }  // E: Amount
        ];
        
        // Apply Header Formatting (Optional, but good practice)
        ['A1', 'B1', 'C1', 'D1', 'E1'].forEach(cell => {
            if (worksheet[cell]) {
                worksheet[cell].s = { font: { bold: true } };
            }
        });
        
        // Add style for the TOTAL/NET TOTAL rows for bold text (Cell D of total rows, Cell E for total amount)
        const totalRows = Object.keys(groupedByStore).length;
        for (let i = 0; i < totalRows; i++) {
            const totalCellRef = XLSX.utils.encode_cell({r: netTotalRowIndex - (totalRows - i), c: 3});
            if (worksheet[totalCellRef]) {
                 worksheet[totalCellRef].s = { font: { bold: true, color: { rgb: "000000" } } };
            }
             const totalAmountRef = XLSX.utils.encode_cell({r: netTotalRowIndex - (totalRows - i), c: 4});
            if (worksheet[totalAmountRef]) {
                 worksheet[totalAmountRef].s = { font: { bold: true, color: { rgb: "000000" } } };
            }
        }
        
        // Style for NET TOTAL row
        const netTotalTextCellRef = XLSX.utils.encode_cell({r: netTotalRowIndex, c: 3});
        if (worksheet[netTotalTextCellRef]) {
             worksheet[netTotalTextCellRef].s = { font: { bold: true, color: { rgb: "000000" } } };
        }
        const netTotalAmountCellRef = XLSX.utils.encode_cell({r: netTotalRowIndex, c: 4});
        if (worksheet[netTotalAmountCellRef]) {
             worksheet[netTotalAmountCellRef].s = { font: { bold: true, color: { rgb: "000000" } } };
        }


        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Details');
        const fileName = `Detailed_Purchase_Report_${dateRange[0].format('YYYYMMDD')}-${dateRange[1].format('YYYYMMDD')}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        message.success({ content: 'Detailed report downloaded!', key: 'export_details' });
    } catch (error) {
        console.error("Export Error:", error)
        message.error({ content: `Failed to generate report: ${error.message}`, key: 'export_details' });
    } finally {
        setExporting(false);
    }
};

// ... (The rest of the component remains unchanged)
// I am keeping the other functions and the render block as they were, 
// only replacing the handleExportPurchaseDetails function with the final correct logic.


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
  
  const lowStockCount = inventory.filter(item => parseFloat(item.current_stock) <= parseFloat(item.minimum_stock)).length;
  const filteredInventory = inventory.filter(item => item.Item?.name?.toLowerCase().includes(searchText.toLowerCase()));

  const exportMenu = (
    <Menu onClick={({ key }) => handleExportLastPurchase(key === 'all' ? null : parseInt(key, 10))}>
      <Menu.Item key="all" icon={<DownloadOutlined />}>All Stores (Last Purchase)</Menu.Item>
      <Menu.Divider />
      {stores.map(store => (<Menu.Item key={store.id} icon={<ShopOutlined />}>{store.name} (Last Purchase)</Menu.Item>))}
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
            <Dropdown overlay={exportMenu}><Button>Export Last Purchase <DownOutlined /></Button></Dropdown>
          </Space>
          <Table columns={inventoryColumns} dataSource={filteredInventory} rowKey="id" loading={loading} />
        </TabPane>
        
        <TabPane tab="Transaction History" key="2">
          <Space style={{ marginBottom: 16 }}>
            <RangePicker value={dateRange} onChange={setDateRange} />
            <Button type="primary" onClick={fetchTransactions} icon={<SyncOutlined />}>Refresh</Button>
            <Button type="primary" danger icon={<DownloadOutlined />} onClick={handleExportPurchaseDetails} loading={exporting}>
              Export Purchase Details
            </Button>
          </Space>
          <Table columns={transactionColumns} dataSource={transactions} rowKey="id" loading={transactionLoading} />
        </TabPane>
      </Tabs>

      <Modal title="Correct Last Purchase" visible={correctionModalVisible} onCancel={() => setCorrectionModalVisible(false)} footer={null}>
        {correctionRecord && (
          <Form form={correctionForm} layout="vertical" onFinish={handleCorrectionSubmit}>
            <Typography.Title level={5}>{correctionRecord.Item.name}</Typography.Title>
            <Text type="secondary">Correcting purchase from {correctionRecord.Store.name} on {moment(correctionRecord.transaction_date).format('DD MMM YYYY')}</Text>
            <Row gutter={[16, 16]} style={{ marginTop: 20 }}><Col span={12}><Statistic title="Original Quantity" value={correctionRecord.quantity} /></Col><Col span={12}><Statistic title="Original Unit Price" value={correctionRecord.unit_price} prefix="₹" precision={2} /></Col></Row>
            <Form.Item name="quantity" label="Corrected Quantity" rules={[{ required: true }]} style={{ marginTop: 20 }}><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="unit_price" label="Corrected Unit Price (₹)" rules={[{ required: true }]}><InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} /></Form.Item>
            <Alert message="Warning" description="This will update the last purchase record and adjust the total stock. This action cannot be undone." type="warning" showIcon style={{ marginBottom: 20 }}/>
            <Form.Item><Space><Button type="primary" htmlType="submit" loading={confirmLoading}>Apply Correction</Button><Button onClick={() => setCorrectionModalVisible(false)}>Cancel</Button></Space></Form.Item>
          </Form>
        )}
      </Modal>
    </Card>
  );
};

export default InventoryManagement;