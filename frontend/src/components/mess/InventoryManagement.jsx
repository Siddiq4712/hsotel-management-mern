import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Table, Button, Space, message, Modal, Form, Select, InputNumber,
  Tabs, Typography, Tag, Input, DatePicker, Row, Col, Statistic, Alert,
  ConfigProvider, theme, Skeleton, Divider
} from 'antd';
import {
  Package, Search, RefreshCw, FileDown, AlertTriangle, 
  Store, History, Edit3, Filter, LayoutGrid, FileSpreadsheet,Plus,
  ChevronRight, CheckCircle2, ShoppingBag, PackageX
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// --- 1. Meaningful Empty State Component ---
const EmptyState = ({ icon: Icon, title, subtitle, actionText, onAction }) => (
  <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100 my-4 animate-in fade-in zoom-in duration-500">
    <div className="p-6 bg-slate-50 rounded-full mb-6">
      <Icon size={48} className="text-slate-300" strokeWidth={1.5} />
    </div>
    <Title level={4} className="text-slate-800 mb-2">{title}</Title>
    <Text className="text-slate-500 block mb-8 max-w-xs mx-auto">{subtitle}</Text>
    {onAction && (
      <Button 
        type="primary" 
        size="large" 
        onClick={onAction} 
        className="flex items-center gap-2 rounded-xl h-12 px-8 shadow-lg shadow-blue-100 font-semibold"
      >
        <Plus size={18} /> {actionText}
      </Button>
    )}
  </div>
);

// --- 2. Meaningful Skeleton for Inventory ---
const InventorySkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton.Input active style={{ width: 250 }} />
        <Skeleton.Button active style={{ width: 120 }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="square" size="large" />
          <div className="flex-1">
            <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1, width: '20%' }} />
          </div>
          <Skeleton.Button active style={{ width: 100 }} />
        </div>
      ))}
    </div>
  </Card>
);

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('1');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment()]);
  const [selectedStoreId, setSelectedStoreId] = useState(undefined);
  
  const [correctionModalVisible, setCorrectionModalVisible] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState(null);
  const [correctionForm] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [inv, str] = await Promise.all([
        messAPI.getItemStock(),
        messAPI.getStores()
      ]);
      setInventory(inv.data.data || []);
      setStores(str.data.data || []);
    } finally {
      setTimeout(() => setLoading(false), 1200);
    }
  };

  const fetchTransactions = async () => {
    setTransactionLoading(true);
    try {
      const params = {
        from_date: dateRange[0].format('YYYY-MM-DD'),
        to_date: dateRange[1].format('YYYY-MM-DD')
      };
      const response = await messAPI.getInventoryTransactions(params);
      setTransactions(response.data.data || []);
    } finally {
      setTimeout(() => setTransactionLoading(false), 600);
    }
  };

  useEffect(() => {
    if (activeTab === '2') fetchTransactions();
  }, [activeTab, dateRange]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesStore = !selectedStoreId || item.last_bought_store_id === parseInt(selectedStoreId);
      const matchesStock = !lowStockOnly || parseFloat(item.current_stock) <= parseFloat(item.minimum_stock);
      const matchesSearch = !searchText || (item.Item?.name || '').toLowerCase().includes(searchText.toLowerCase());
      return matchesStore && matchesStock && matchesSearch;
    });
  }, [inventory, selectedStoreId, lowStockOnly, searchText]);

  // --- START PRESERVED XLSX LOGIC ---
  const handleExportLastPurchase = async (storeId = null) => {
    const storeName = storeId ? stores.find(s => s.id === storeId)?.name : 'All Stores';
    message.loading({ content: `Generating report for ${storeName}...`, key: `export_${storeId}` });

    let itemsToExport = inventory.filter(item => item.last_bought_store_name);
    if (storeId) itemsToExport = itemsToExport.filter(item => item.last_bought_store_id === storeId);

    if (itemsToExport.length === 0) {
      message.warning({ content: 'No purchase data found for this selection', key: `export_${storeId}` });
      return;
    }

    const groupedByStore = itemsToExport.reduce((acc, item) => {
      const storeKey = item.last_bought_store_name || 'Unknown';
      if (!acc[storeKey]) acc[storeKey] = [];
      acc[storeKey].push(item);
      return acc;
    }, {});

    const sortedGroups = Object.keys(groupedByStore).sort().reduce((result, key) => {
      result[key] = groupedByStore[key].sort((a, b) => (a.Item?.name || '').localeCompare(b.Item?.name || ''));
      return result;
    }, {});

    const currentMonth = moment().format('MMMM YYYY');
    let excelDataArray = [
      [`NATIONAL ENGINEERING COLLEGE : GENTS HOSTEL - ${currentMonth}`],
      [`Date : ${moment().format('DD.MM.YYYY')}`],
      [], 
      ['Item Name', 'Supplier Name', 'Approval Qty', 'RPU', 'Cost Rs.'],
    ];

    const merges = [];
    let netTotal = 0;
    let netTotalQty = 0;
    let currentRow = 4;

    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } });

    for (const [sName, items] of Object.entries(sortedGroups)) {
      let storeTotal = 0;
      let storeTotalQty = 0;
      const startRow = currentRow;

      const storeItemRows = items.map((item) => {
        const qty = parseFloat(item.last_bought_qty || 0);
        const rpu = parseFloat(item.last_bought_unit_price || 0);
        const cost = parseFloat(item.last_bought_overall_cost || 0);
        storeTotal += cost; storeTotalQty += qty;
        return [item.Item?.name || 'N/A', '', qty, rpu.toFixed(2), cost.toFixed(2)];
      });

      excelDataArray.push(...storeItemRows);
      const endRow = startRow + items.length - 1;
      merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } });

      const middleRow = startRow + Math.floor((endRow - startRow) / 2);
      excelDataArray[middleRow][1] = { v: sName, s: { alignment: { vertical: 'center', horizontal: 'center' }, font: { bold: true } } };

      const weightedRPU = storeTotalQty > 0 ? (storeTotal / storeTotalQty).toFixed(2) : '0.00';
      excelDataArray.push([{ v: 'TOTAL', s: { font: { bold: true } } }, '', storeTotalQty, weightedRPU, { v: storeTotal.toFixed(2), s: { font: { bold: true } } }]);
      netTotal += storeTotal; netTotalQty += storeTotalQty;
      currentRow = currentRow + items.length + 1;
    }

    const netRPU = netTotalQty > 0 ? (netTotal / netTotalQty).toFixed(2) : '0.00';
    excelDataArray.push([{ v: 'NET TOTAL', s: { font: { bold: true } } }, '', netTotalQty, netRPU, { v: netTotal.toFixed(2), s: { font: { bold: true } } }]);
    excelDataArray.push([], [], [], [{ v: 'ASSOCIATE WARDEN', s: { font: { bold: true }, alignment: { horizontal: 'center' } } }, '', { v: 'WARDEN', s: { font: { bold: true }, alignment: { horizontal: 'center' } } }, '', { v: 'DIRECTOR', s: { font: { bold: true }, alignment: { horizontal: 'center' } } }]);

    const worksheet = XLSX.utils.aoa_to_sheet(excelDataArray);
    worksheet['!merges'] = merges;
    worksheet['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Last Purchase Report');
    XLSX.writeFile(workbook, `Procurement_Report_${moment().format('YYYY-MM-DD')}.xlsx`);
    message.success({ content: 'Report generated successfully!', key: `export_${storeId}` });
  };
  // --- END PRESERVED XLSX LOGIC ---

  const handleCorrectionSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      await messAPI.correctLastPurchase({
        item_id: correctionRecord.Item.id,
        new_quantity: values.quantity,
        new_unit_price: values.unit_price
      });
      message.success('Correction applied successfully');
      setCorrectionModalVisible(false);
      fetchInitialData();
    } finally { setConfirmLoading(false); }
  };

  const inventoryColumns = [
    { 
      title: 'Item Description', 
      key: 'name', 
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">{r.Item?.name}</Text>
          <Text className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{r.Item?.tbl_ItemCategory?.name}</Text>
        </Space>
      )
    },
    { 
      title: 'Current Stock', 
      align: 'right',
      render: (_, r) => {
        const isLow = parseFloat(r.current_stock) <= parseFloat(r.minimum_stock);
        return (
          <Space direction="vertical" align="end" size={0}>
            <Text strong className={isLow ? 'text-rose-500' : 'text-emerald-600'}>
              {parseFloat(r.current_stock).toFixed(2)} {r.Item?.UOM?.abbreviation}
            </Text>
            {isLow && <Tag color="error" bordered={false} className="m-0 text-[9px] rounded-full px-2 font-bold">LOW STOCK</Tag>}
          </Space>
        );
      }
    },
    { 
      title: 'Latest Procurement', 
      key: 'procurement',
      render: (_, r) => r.last_bought_store_name ? (
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <Store size={14} className="text-blue-500" />
            <Text className="text-xs font-bold text-slate-700 truncate">{r.last_bought_store_name}</Text>
          </div>
          <Text className="text-[11px] text-slate-500">
            {parseFloat(r.last_bought_qty).toFixed(2)} units @ ₹{parseFloat(r.last_bought_unit_price).toFixed(2)}
          </Text>
        </div>
      ) : <Text type="secondary" className="italic">No purchase history</Text>
    }
  ];

  const transactionColumns = [
    { title: 'Date', dataIndex: 'transaction_date', render: d => moment(d).format('DD MMM YYYY') },
    { title: 'Item', dataIndex: ['Item', 'name'], render: t => <Text strong>{t}</Text> },
    { title: 'Type', dataIndex: 'transaction_type', render: t => <Tag bordered={false} className={`rounded-full px-3 font-bold ${t === 'purchase' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{t.toUpperCase()}</Tag> },
    { title: 'Quantity', render: (_, r) => `${parseFloat(r.quantity).toFixed(2)} ${r.unit}` },
    { title: 'Unit Price', render: (_, r) => <Text className="text-blue-600 font-medium">₹{parseFloat(r.unit_price || 0).toFixed(2)}</Text> },
    {
      title: 'Action',
      align: 'right',
      render: (_, r) => r.transaction_type === 'purchase' && (
        <Button icon={<Edit3 size={14}/>} onClick={() => { setCorrectionRecord(r); correctionForm.setFieldsValue(r); setCorrectionModalVisible(true); }} className="rounded-lg h-8 flex items-center">Correct</Button>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 16 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <LayoutGrid className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Inventory Hub</Title>
              <Text type="secondary">Automated procurement reporting and stock tracking</Text>
            </div>
          </div>
          <div className="flex gap-3">
             <Button icon={<RefreshCw size={16}/>} onClick={fetchInitialData} className="rounded-xl h-12">Sync</Button>
             <Button type="primary" icon={<FileSpreadsheet size={18}/>} onClick={() => handleExportLastPurchase()} className="rounded-xl h-12 shadow-lg shadow-blue-100 flex items-center gap-2 font-semibold">Generate Report</Button>
          </div>
        </div>

        {/* Stats Summary */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-none shadow-sm rounded-2xl">
              <Statistic title={<span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Live Inventory</span>} value={inventory.length} prefix={<Package size={18} className="text-blue-500 mr-2" />} suffix="Items" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="border-none shadow-sm rounded-2xl">
              <Statistic title={<span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Low Stock Alert</span>} value={inventory.filter(i => parseFloat(i.current_stock) <= parseFloat(i.minimum_stock)).length} valueStyle={{ color: '#ef4444' }} prefix={<AlertTriangle size={18} className="text-rose-500 mr-2" />} />
            </Card>
          </Col>
        </Row>

        {/* Tab Navigation */}
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          className="custom-inventory-tabs"
          items={[
            {
              key: '1',
              label: <span className="flex items-center gap-2"><Package size={16}/> Current Stock</span>,
              children: (
                <div className="space-y-6">
                  <Card className="border-none shadow-sm rounded-2xl">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100 flex-1 max-w-md">
                        <Search size={18} className="text-slate-300" />
                        <Input placeholder="Search item name..." bordered={false} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                      </div>
                      <Select placeholder="Filter by Store" className="w-64" value={selectedStoreId} onChange={setSelectedStoreId} allowClear dropdownStyle={{ borderRadius: 12 }}>
                        {stores.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                      </Select>
                      <Button 
                        onClick={() => setLowStockOnly(!lowStockOnly)} 
                        className={`rounded-xl h-10 px-6 transition-all ${lowStockOnly ? 'bg-rose-50 text-rose-600 border-rose-100 font-bold' : 'text-slate-600'}`}
                      >
                        {lowStockOnly ? 'Low Stock Active' : 'Filter Low Stock'}
                      </Button>
                    </div>
                  </Card>

                  {loading ? <InventorySkeleton /> : filteredInventory.length === 0 ? (
                    <EmptyState icon={PackageX} title="No Inventory Data" subtitle="Your stock filters didn't return any results. Try adjusting the store or name search." actionText="Clear All Filters" onAction={() => { setSearchText(''); setSelectedStoreId(''); setLowStockOnly(false); }} />
                  ) : (
                    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                      <Table dataSource={filteredInventory} columns={inventoryColumns} pagination={{ pageSize: 10 }} rowKey="id" />
                    </Card>
                  )}
                </div>
              )
            },
            {
              key: '2',
              label: <span className="flex items-center gap-2"><History size={16}/> Transaction History</span>,
              children: (
                <div className="space-y-6">
                  <Card className="border-none shadow-sm rounded-2xl">
                    <div className="flex justify-between items-center">
                      <Space size="large">
                        <RangePicker value={dateRange} onChange={setDateRange} className="rounded-xl h-11" />
                        <Button type="primary" ghost icon={<RefreshCw size={16}/>} onClick={fetchTransactions} className="rounded-xl">Update History</Button>
                      </Space>
                      <Button type="primary" danger ghost icon={<FileDown size={18}/>} onClick={() => message.info("Exporting transaction history...")} className="rounded-xl h-11 border-dashed">Export CSV</Button>
                    </div>
                  </Card>

                  {transactionLoading ? <InventorySkeleton /> : transactions.length === 0 ? (
                    <EmptyState icon={ShoppingBag} title="No Movements" subtitle="No stock purchases or consumptions recorded for this date range." />
                  ) : (
                    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                      <Table dataSource={transactions} columns={transactionColumns} pagination={{ pageSize: 10 }} rowKey="id" />
                    </Card>
                  )}
                </div>
              )
            }
          ]}
        />

        {/* Modal: FIFO Purchase Correction */}
        <Modal 
          title={<div className="flex items-center gap-2 text-blue-600"><Edit3 size={18}/> Purchase Correction</div>}
          open={correctionModalVisible}
          onCancel={() => setCorrectionModalVisible(false)}
          onOk={() => correctionForm.submit()}
          confirmLoading={confirmLoading}
          className="rounded-2xl"
          okText="Apply Correction"
        >
          {correctionRecord && (
            <Form form={correctionForm} layout="vertical" onFinish={handleCorrectionSubmit} className="mt-4">
               <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 flex justify-between">
                  <div>
                    <Text className="text-blue-400 text-[10px] uppercase font-bold block mb-1">Item Info</Text>
                    <Text strong className="text-lg text-blue-900">{correctionRecord.Item?.name}</Text>
                  </div>
                  <div className="text-right">
                    <Text className="text-blue-400 text-[10px] uppercase font-bold block mb-1">Source</Text>
                    <Tag bordered={false} color="blue" className="rounded-full font-bold">{correctionRecord.Store?.name}</Tag>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <Form.Item name="quantity" label="Corrected Quantity" rules={[{required: true}]}><InputNumber className="w-full h-10 flex items-center" precision={2} /></Form.Item>
                 <Form.Item name="unit_price" label="Corrected Price (₹)" rules={[{required: true}]}><InputNumber className="w-full h-10 flex items-center" precision={2} /></Form.Item>
               </div>

               <Alert 
                  message="FIFO Recalculation Notice" 
                  description="Saving this will recalculate the unit rates for all subsequent batches of this item. Ensure the physical stock matches before proceeding." 
                  type="warning" 
                  showIcon 
                  icon={<AlertTriangle size={20} />}
                  className="rounded-2xl border-amber-100 bg-amber-50"
               />
            </Form>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default InventoryManagement;