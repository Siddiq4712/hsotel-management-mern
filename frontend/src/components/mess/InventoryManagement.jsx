import React, { useState, useEffect, useMemo } from 'react';
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
  const [selectedStoreId, setSelectedStoreId] = useState('');

  // Pagination state for inventory table
  const [inventoryPagination, setInventoryPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    fetchAllInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === '2') {
      fetchTransactions();
    }
  }, [activeTab, dateRange]);

  // Filter inventory data with useMemo to avoid re-renders
  const filteredInventory = useMemo(() => {
    let filtered = [...inventory];
    if (selectedStoreId && selectedStoreId !== '') {
      filtered = filtered.filter(item => item.last_bought_store_id === parseInt(selectedStoreId));
    }
    if (lowStockOnly) {
      filtered = filtered.filter(item => parseFloat(item.current_stock) <= parseFloat(item.minimum_stock));
    }
    if (searchText) {
      filtered = filtered.filter(item => 
        (item.Item?.name || '').toLowerCase().includes(searchText.toLowerCase())
      );
    }
    return filtered;
  }, [inventory, selectedStoreId, lowStockOnly, searchText]);

  // Update pagination total when filtered data changes
  useEffect(() => {
    setInventoryPagination(prev => ({ ...prev, total: filteredInventory.length, current: 1 }));
  }, [filteredInventory]);

  // Paginated data
  const paginatedInventory = useMemo(() => {
    const { current, pageSize } = inventoryPagination;
    const start = (current - 1) * pageSize;
    const end = start + pageSize;
    return filteredInventory.slice(start, end);
  }, [filteredInventory, inventoryPagination]);

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
  };

  // Handle pagination change
  const handleInventoryPaginationChange = (page, pageSize) => {
    setInventoryPagination({ ...inventoryPagination, current: page, pageSize });
  };

  // Handle table change (for sort, but since client-side, Antd handles it)
  const handleInventoryTableChange = (pagination, filters, sorter) => {
    // Client-side sort is handled by Antd Table sorter prop
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
    message.warning('No items found'); // string only
    message.success('Report downloaded successfully!');
    return;
  }

  // Group items by last_bought_store_name
  const groupedByStore = itemsToExport.reduce((acc, item) => {
    const storeKey = item.last_bought_store_name || 'Unknown';
    if (!acc[storeKey]) acc[storeKey] = [];
    acc[storeKey].push(item);
    return acc;
  }, {});

  // Sort groups alphabetically by store name
  const sortedGroups = Object.keys(groupedByStore)
    .sort()
    .reduce((result, key) => {
      result[key] = groupedByStore[key];
      return result;
    }, {});

  // Sort items within each group by item name
  Object.keys(sortedGroups).forEach((storeKey) => {
    sortedGroups[storeKey].sort((a, b) =>
      (a.Item?.name || '').localeCompare(b.Item?.name || '')
    );
  });

  if (Object.keys(sortedGroups).length === 0) {
    message.warn('No grouped purchase history found')
    message.success('Report downloaded successfully!');

    return;
  }

  const currentMonth = moment().format('MMMM YYYY');
  let excelDataArray = [
    [`NATIONAL ENGINEERING COLLEGE : GENTS HOSTEL - ${currentMonth}`],
    [`Date : ${moment().format('DD.MM.YYYY')}`],
    [], // Blank row
    ['Item Name', 'Supplier Name', 'Approval Qty', 'RPU', 'Cost Rs.'], // Header
  ];

  const merges = [];
  let netTotal = 0;
  let netTotalQty = 0;
  let currentRow = 4; // 0-based index for first data row (after title, date, blank, header)

  // Merge title and date rows
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } });

  for (const [storeName, items] of Object.entries(sortedGroups)) {
    let storeTotal = 0;
    let storeTotalQty = 0;
    const startRow = currentRow;

    const storeItemRows = items.map((item) => {
      const qty = parseFloat(item.last_bought_qty || 0);
      const rpu = parseFloat(item.last_bought_unit_price || 0);
      const cost = parseFloat(item.last_bought_overall_cost || 0);
      storeTotal += cost;
      storeTotalQty += qty;

      const itemName = item.Item?.name || 'N/A';
      return [itemName, '', qty, rpu.toFixed(2), cost.toFixed(2)];
    });

    excelDataArray.push(...storeItemRows);

    const endRow = startRow + items.length - 1;

    // Merge supplier name column vertically
    merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } });

    // Place store name in the middle row with styling for centering
    const middleRow = startRow + Math.floor((endRow - startRow) / 2);
    excelDataArray[middleRow][1] = {
      v: storeName,
      s: {
        alignment: { vertical: 'center', horizontal: 'center' },
        font: { bold: true },
      },
    };

    // Subtotal row: TOTAL in A, empty B, total qty in C, weighted RPU in D, total cost in E
    const weightedRPU = storeTotalQty > 0 ? (storeTotal / storeTotalQty).toFixed(2) : '0.00';
    const totalRowData = [
      { v: 'TOTAL', s: { font: { bold: true } } },
      '',
      storeTotalQty,
      weightedRPU,
      { v: storeTotal.toFixed(2), s: { font: { bold: true } } },
    ];
    excelDataArray.push(totalRowData);

    const totalRowIndex = currentRow + items.length;
    netTotal += storeTotal;
    netTotalQty += storeTotalQty;

    // Advance currentRow past items and subtotal
    currentRow = totalRowIndex + 1;
  }

  // Net total row
  const netWeightedRPU = netTotalQty > 0 ? (netTotal / netTotalQty).toFixed(2) : '0.00';
  const netTotalRowData = [
    { v: 'NET TOTAL', s: { font: { bold: true } } },
    '',
    netTotalQty,
    netWeightedRPU,
    { v: netTotal.toFixed(2), s: { font: { bold: true } } },
  ];
  const netTotalRowIndex = excelDataArray.length;
  excelDataArray.push(netTotalRowData);

  // Add blank rows for spacing before signatures
  excelDataArray.push([]); // Blank
  excelDataArray.push([]); // Blank
  excelDataArray.push([]); // Blank

  // Signature row
  const signatureRowData = [
    { v: 'ASSOCIATE WARDEN', s: { font: { bold: true }, alignment: { horizontal: 'center' } } },
    '',
    { v: 'WARDEN', s: { font: { bold: true }, alignment: { horizontal: 'center' } } },
    '',
    { v: 'DIRECTOR', s: { font: { bold: true }, alignment: { horizontal: 'center' } } }
  ];
  excelDataArray.push(signatureRowData);

  const worksheet = XLSX.utils.aoa_to_sheet(excelDataArray);
  worksheet['!merges'] = merges;

  // Column widths
  worksheet['!cols'] = [
    { wch: 40 }, // Item Name
    { wch: 25 }, // Supplier Name
    { wch: 15 }, // Approval Qty
    { wch: 15 }, // RPU
    { wch: 20 }, // Cost Rs.
  ];

  // Style title and date rows (1-based refs: A1, A2)
  if (worksheet['A1']) {
    worksheet['A1'].s = {
      font: { bold: true, size: 14 },
      alignment: { horizontal: 'center' },
    };
  }
  if (worksheet['A2']) {
    worksheet['A2'].s = {
      font: { bold: true },
      alignment: { horizontal: 'center' },
    };
  }

  // Style header row (1-based: row 4 -> A4-E4)
  ['A4', 'B4', 'C4', 'D4', 'E4'].forEach((cellRef) => {
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = { 
        font: { bold: true },
        alignment: { horizontal: 'center' }
      };
    }
  });

  // Apply borders and alignments to all data rows (from header row onwards, including totals and signatures)
  const headerRowIndex = 3; // 0-based for header
  const lastRowIndex = excelDataArray.length - 1;
  for (let r = headerRowIndex; r <= lastRowIndex; r++) {
    for (let c = 0; c < 5; c++) { // 5 columns
      const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
      if (worksheet[cellAddress]) {
        const currentStyle = worksheet[cellAddress].s || {};
        worksheet[cellAddress].s = {
          ...currentStyle,
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          },
          alignment: {
            ...currentStyle.alignment,
            vertical: 'center'
          }
        };

        // Specific horizontal alignments
        if (r === headerRowIndex) {
          // Header: center
          worksheet[cellAddress].s.alignment.horizontal = 'center';
        } else if (c === 0) {
          // Column A (Item Name, TOTAL, NET TOTAL): left
          worksheet[cellAddress].s.alignment.horizontal = 'left';
        } else if (c === 1) {
          // Column B (Supplier, merged): center
          worksheet[cellAddress].s.alignment.horizontal = 'center';
        } else {
          // Columns C, D, E (numbers): right
          worksheet[cellAddress].s.alignment.horizontal = 'right';
        }
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Last Purchase Report');
  const fileName = `Last_Purchase_Report_${storeName.replace(/\s+/g, '_')}_${moment().format('YYYY-MM-DD')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  message.success({ content: 'Report downloaded successfully!', key: `export_${storeId}` });
};
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
      message.warn('No purchase data found for the selected date range.')
      message.success('Report downloaded successfully!');

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

    // Sort groups alphabetically by store name
    const sortedGroups = Object.keys(groupedByStore)
      .sort()
      .reduce((result, key) => {
        result[key] = groupedByStore[key];
        return result;
      }, {});

    // Sort items within each group by item name
    Object.keys(sortedGroups).forEach((storeKey) => {
      sortedGroups[storeKey].sort((a, b) =>
        (a.Item?.name || '').localeCompare(b.Item?.name || '')
      );
    });

    // Data structure for XLSX AOA (Array of Arrays)
    const currentMonth = `${dateRange[0].format('MMMM YYYY')}`;
    let excelDataArray = [
      [`NATIONAL ENGINEERING COLLEGE : GENTS HOSTEL - ${currentMonth}`],
      [`Date : ${moment().format('DD.MM.YYYY')}`],
      [], // Blank row
      ['Item Name', 'Supplier Name', 'Qty', 'Rate', 'Amount'] // Header Row (Row 3)
    ];

    const merges = [];
    let netTotal = 0;
    let currentRow = 4; // Start after title(0), date(1), blank(2), header(3)

    // Merge title and date rows
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } });

    for (const [storeName, items] of Object.entries(sortedGroups)) {
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
      const totalRowData = ['', '', '', { v: 'TOTAL', s: { font: { bold: true, color: { rgb: "000000" } } } }, { v: parseFloat(storeTotal).toFixed(2), s: { font: { bold: true, color: { rgb: "000000" } } } }];
      excelDataArray.push(totalRowData);
      netTotal += storeTotal;

      // Prepare for Total Merge (columns B, C, D) - to align 'TOTAL' text to the bottom right of the table
      const totalRowIndex = currentRow + items.length; // Row index of the just-added 'TOTAL' row
      merges.push({ s: { r: totalRowIndex, c: 1 }, e: { r: totalRowIndex, c: 3 } }); // Merge B to D

      // Update currentRow to the next starting point (after the total row)
      currentRow = totalRowIndex + 1;
    }

    // 3. Add Net Total Row
    const netTotalRowData = ['', '', '', { v: 'NET TOTAL', s: { font: { bold: true, color: { rgb: "000000" } } } }, { v: parseFloat(netTotal).toFixed(2), s: { font: { bold: true, color: { rgb: "000000" } } } }];
    const netTotalRowIndex = excelDataArray.length;
    excelDataArray.push(netTotalRowData);

    // Prepare for Net Total Merge (columns B, C, D)
    merges.push({ s: { r: netTotalRowIndex, c: 1 }, e: { r: netTotalRowIndex, c: 3 } });

    // Add blank rows for spacing before signatures
    excelDataArray.push([]); // Blank
    excelDataArray.push([]); // Blank
    excelDataArray.push([]); // Blank

    // Signature row
    const signatureRowData = [
      { v: 'ASSOCIATE WARDEN', s: { font: { bold: true }, alignment: { horizontal: 'center' } } },
      '',
      { v: 'WARDEN', s: { font: { bold: true }, alignment: { horizontal: 'center' } } },
      '',
      { v: 'DIRECTOR', s: { font: { bold: true }, alignment: { horizontal: 'center' } } }
    ];
    excelDataArray.push(signatureRowData);

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
      { wch: 20 }  // E: Amount
    ];

    // Style title and date rows (1-based: A1, A2)
    if (worksheet['A1']) {
      worksheet['A1'].s = {
        font: { bold: true, size: 14 },
        alignment: { horizontal: 'center' },
      };
    }
    if (worksheet['A2']) {
      worksheet['A2'].s = {
        font: { bold: true },
        alignment: { horizontal: 'center' },
      };
    }

    // Apply Header Formatting (1-based: row 4 -> A4-E4)
    ['A4', 'B4', 'C4', 'D4', 'E4'].forEach(cellRef => {
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = { font: { bold: true } };
      }
    });

    // Apply borders to all data rows (from header row onwards)
    const headerRowIndex = 3; // 0-based
    const lastRowIndex = excelDataArray.length - 1;
    for (let r = headerRowIndex; r <= lastRowIndex; r++) {
      const row = worksheet[XLSX.utils.encode_row(r + 1)]; // 1-based row ref
      if (row) {
        for (let c = 0; c < 5; c++) { // 5 columns
          const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = {
              ...worksheet[cellAddress].s,
              border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              }
            };
          }
        }
      }
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

  const inventoryColumns = [
    { 
      title: 'Item Name', 
      dataIndex: ['Item', 'name'], 
      key: 'name', 
      sorter: (a, b) => (a.Item?.name || '').localeCompare(b.Item?.name || ''), 
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          {parseFloat(record.current_stock) <= parseFloat(record.minimum_stock) && (
            <Tag color="red" icon={<WarningOutlined />} style={{ marginTop: 4 }}>
              Low Stock
            </Tag>
          )}
        </div>
      ) 
    },
    { title: 'Category', dataIndex: ['Item', 'tbl_ItemCategory', 'name'], key: 'category' },
    { 
      title: 'Current Stock', 
      dataIndex: 'current_stock', 
      key: 'current_stock', 
      align: 'right', 
      sorter: (a, b) => a.current_stock - b.current_stock, 
      render: (text, record) => `${text} ${record.Item?.UOM?.abbreviation || 'units'}` 
    },
    { 
      title: 'Last Purchase', 
      key: 'last_purchase', 
      render: (_, record) => (
        record.last_bought_store_name ? (
          <div>
            <Tag color="blue" icon={<ShopOutlined />}>
              {record.last_bought_store_name}
            </Tag>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Qty: {record.last_bought_qty} @ ₹{parseFloat(record.last_bought_unit_price).toFixed(2)}
            </Text>
          </div>
        ) : (
          <Text type="secondary">N/A</Text>
        )
      ) 
    },
    { 
      title: 'Last Updated', 
      dataIndex: 'last_updated', 
      key: 'last_updated', 
      render: text => moment(text).format('YYYY-MM-DD HH:mm'), 
      sorter: (a, b) => moment(a.last_updated).unix() - moment(b.last_updated).unix() 
    },
  ];

  const transactionColumns = [
    { title: 'Date', dataIndex: 'transaction_date', key: 'date', render: date => moment(date).format('YYYY-MM-DD'), sorter: (a, b) => moment(a.transaction_date).unix() - moment(b.transaction_date).unix() },
    { title: 'Item', dataIndex: ['Item', 'name'], key: 'item' },
    { title: 'Type', dataIndex: 'transaction_type', key: 'type', render: type => (<Tag color={type === 'purchase' ? 'green' : 'orange'}>{type.toUpperCase()}</Tag>), filters: [{ text: 'Purchase', value: 'purchase' }, { text: 'Consumption', value: 'consumption' }], onFilter: (value, record) => record.transaction_type === value },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', render: (qty, record) => `${qty} ${record.unit}` },
    { title: 'Unit Price', dataIndex: 'unit_price', key: 'unit_price', render: price => `₹${parseFloat(price || 0).toFixed(2)}` },
    { title: 'Store', dataIndex: ['Store', 'name'], key: 'store', render: text => text || 'N/A' },
    {
      title: 'Actions', key: 'actions', render: (_, record) => {
        const latestPurchaseForItem = transactions.filter(t => t.Item.id === record.Item.id && t.transaction_type === 'purchase').sort((a, b) => moment(b.transaction_date).diff(moment(a.transaction_date)))[0];
        if (record.transaction_type === 'purchase' && record.id === latestPurchaseForItem?.id) {
          return (<Button icon={<EditOutlined />} size="small" onClick={() => handleOpenCorrectionModal(record)}>Correct</Button>);
        }
        return null;
      }
    },
  ];

  const lowStockCount = inventory.filter(item => parseFloat(item.current_stock) <= parseFloat(item.minimum_stock)).length;

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
            <Input 
              placeholder="Search items..." 
              value={searchText} 
              onChange={e => setSearchText(e.target.value)} 
              style={{ width: 200 }} 
              prefix={<SearchOutlined />} 
              allowClear 
            />
            <Select
              placeholder="Filter by Last Purchase Store"
              style={{ width: 250 }}
              value={selectedStoreId}
              onChange={(value) => setSelectedStoreId(value)}
              allowClear
            >
              <Option value="">All Stores</Option>
              {stores.map(store => (
                <Option key={store.id} value={store.id}>{store.name}</Option>
              ))}
            </Select>
            <Button onClick={() => handleLowStockFilterChange(!lowStockOnly)}>
              {lowStockOnly ? 'Show All Items' : 'Show Low Stock Only'}
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={() => handleExportLastPurchase(selectedStoreId && selectedStoreId !== '' ? parseInt(selectedStoreId) : null)} 
              disabled={filteredInventory.length === 0}
            >
              Export Current View
            </Button>
          </Space>
          <Table 
            columns={inventoryColumns} 
            dataSource={paginatedInventory} 
            rowKey="id" 
            loading={loading}
            pagination={{
              ...inventoryPagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
              onChange: handleInventoryPaginationChange,
              onShowSizeChange: (page, pageSize) => handleInventoryPaginationChange(1, pageSize),
            }}
            onChange={handleInventoryTableChange}
          />
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
            <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
              <Col span={12}><Statistic title="Original Quantity" value={correctionRecord.quantity} /></Col>
              <Col span={12}><Statistic title="Original Unit Price" value={correctionRecord.unit_price} prefix="₹" precision={2} /></Col>
            </Row>
            <Form.Item name="quantity" label="Corrected Quantity" rules={[{ required: true }]} style={{ marginTop: 20 }}>
              <InputNumber min={0.01} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="unit_price" label="Corrected Unit Price (₹)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Alert message="Warning" description="This will update the last purchase record and adjust the total stock. This action cannot be undone." type="warning" showIcon style={{ marginBottom: 20 }} />
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={confirmLoading}>Apply Correction</Button>
                <Button onClick={() => setCorrectionModalVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Card>
  );
};

export default InventoryManagement;