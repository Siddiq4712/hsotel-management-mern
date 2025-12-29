import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Select, message, Space, Typography, Tag,
  Switch, Modal, Form, InputNumber, DatePicker, ConfigProvider, theme, Skeleton, Divider
} from 'antd';
import { 
  Warehouse, PackageSearch, Plus, Download, RefreshCw, 
  Calendar, Layers, Filter, Search, FileBarChart, Info, PackageX 
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

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

// --- 2. Meaningful Skeleton for Stock Table ---
const StockSkeleton = () => (
  <div className="p-4 bg-white rounded-[32px] space-y-4">
    <div className="flex justify-between mb-4 px-2">
        <Skeleton.Input active size="small" style={{ width: 200 }} />
        <div className="flex gap-2">
            <Skeleton.Button active size="small" />
            <Skeleton.Button active size="small" />
        </div>
    </div>
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center justify-between p-4 border-b border-slate-50">
        <div className="flex gap-4 items-center flex-1">
          <Skeleton.Avatar active shape="circle" />
          <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 1, width: '40%' }} />
        </div>
        <Skeleton.Button active style={{ width: 80, marginRight: 40 }} />
        <Skeleton.Button active style={{ width: 100, marginRight: 40 }} />
        <Skeleton.Button active style={{ width: 80 }} />
      </div>
    ))}
  </div>
);

// --- Sub-Component: BatchDetailsTable (Themed) ---
const BatchDetailsTable = ({ itemId, itemName, unit }) => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await messAPI.getItemBatches(itemId);
        setBatches(response.data.data || []);
      } finally { setLoading(false); }
    };
    fetchBatches();
  }, [itemId]);

  const batchColumns = [
    { title: 'Purchase Date', dataIndex: 'purchase_date', render: d => moment(d).format('DD MMM YYYY') },
    { title: 'Unit Price', dataIndex: 'unit_price', render: p => <Text className="text-blue-600 font-mono">₹{parseFloat(p).toFixed(2)}</Text> },
    { title: 'Qty Remaining', dataIndex: 'quantity_remaining', render: q => <Text strong className={q > 0 ? 'text-emerald-600' : 'text-slate-300'}>{parseFloat(q).toFixed(2)} {unit}</Text> },
    { title: 'Status', dataIndex: 'status', render: s => <Tag bordered={false} className="rounded-full uppercase text-[10px]">{s}</Tag> }
  ];

  return (
    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 m-2">
      <Title level={5} className="mb-4 flex items-center gap-2"><Layers size={16} className="text-blue-500" /> FIFO Batch History</Title>
      <Table columns={batchColumns} dataSource={batches} rowKey="id" pagination={false} size="small" loading={loading} />
    </div>
  );
};

const StockManagement = () => {
  const [stocks, setStocks] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLowStock, setShowLowStock] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [isAddStockModalVisible, setIsAddStockModalVisible] = useState(false);
  const [isUnitRateModalVisible, setIsUnitRateModalVisible] = useState(false);
  
  const [addStockForm] = Form.useForm();
  const [unitRateForm] = Form.useForm();

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await messAPI.getItemStock({ low_stock: showLowStock });
      const formatted = (response.data.data || []).map(s => ({
        ...s,
        key: `${s.item_id}-${s.hostel_id}`,
        item_name: s.Item?.name,
        category: s.Item?.tbl_ItemCategory?.name || 'N/A',
        unit: s.Item?.UOM?.abbreviation || 'unit',
        price: s.effective_unit_price
      }));
      setStocks(formatted);
    } catch (e) { message.error("Failed to load stock"); }
    finally { setTimeout(() => setLoading(false), 1200); }
  }, [showLowStock]);

  useEffect(() => { fetchStocks(); fetchItems(); }, [fetchStocks]);

  const fetchItems = async () => {
    const res = await messAPI.getItems();
    setItems(res.data.data || []);
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const response = await messAPI.exportStockToExcel();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Stock_Report_${moment().format('DD_MMM')}.xlsx`);
      link.click();
      message.success('Stock report exported');
    } finally { setExportLoading(false); }
  };

  const columns = [
    {
      title: 'Item Name',
      key: 'item_name',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">{r.item_name}</Text>
          <Text className="text-[10px] text-slate-400 uppercase tracking-wider">{r.category}</Text>
        </Space>
      ),
    },
    { title: 'Unit', dataIndex: 'unit', key: 'unit' },
    {
      title: 'Current Stock',
      key: 'current_stock',
      render: (_, r) => {
        const stock = parseFloat(r.current_stock);
        const isLow = stock <= r.minimum_stock;
        return (
          <Space>
            <Text strong className={isLow ? 'text-rose-500' : 'text-emerald-600'}>{stock.toFixed(2)}</Text>
            {isLow && <Tag color="error" bordered={false} className="rounded-full text-[10px]">LOW</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Avg Price (FIFO)',
      dataIndex: 'price',
      render: p => <Text className="text-blue-600 font-medium">₹{parseFloat(p).toFixed(2)}</Text>
    },
    {
      title: 'Min Stock',
      dataIndex: 'minimum_stock',
      render: s => <Text type="secondary">{parseFloat(s).toFixed(2)}</Text>
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Warehouse className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Stock Management</Title>
              <Text type="secondary">Monitor warehouse inventory and batch consumption</Text>
            </div>
          </div>
          <Space>
            <Button icon={<RefreshCw size={16}/>} onClick={fetchStocks}>Sync</Button>
            <Button icon={<Download size={16}/>} loading={exportLoading} onClick={handleExportExcel}>Export Stock</Button>
            <Button 
                type="primary" 
                size="large" 
                icon={<Plus size={18}/>} 
                onClick={() => setIsAddStockModalVisible(true)}
                className="shadow-lg shadow-blue-100 h-12 px-6"
            >
                Add Stock
            </Button>
          </Space>
        </div>

        {/* Toolbar */}
        <Card className="mb-6 border-none shadow-sm rounded-2xl">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <Filter size={16} className="text-slate-400" />
                  <Switch checked={showLowStock} onChange={setShowLowStock} size="small" />
                  <Text className="text-xs text-slate-500 font-medium">Low Stock Only</Text>
               </div>
            </div>
            <Button 
              icon={<FileBarChart size={16}/>} 
              onClick={() => setIsUnitRateModalVisible(true)}
              className="text-indigo-600 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white"
            >
              Generate Monthly Report
            </Button>
          </div>
        </Card>

        {/* Main Content Area */}
        {loading ? (
          <StockSkeleton />
        ) : stocks.length === 0 ? (
          <EmptyState 
            icon={PackageX}
            title="No Inventory Found"
            subtitle="Your store seems to be empty. Add new stock batches to manage raw materials for your mess."
            actionText="Purchase First Stock"
            onAction={() => setIsAddStockModalVisible(true)}
          />
        ) : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700" bodyStyle={{ padding: 0 }}>
            <Table
              dataSource={stocks}
              columns={columns}
              rowKey="key"
              expandable={{ expandedRowRender: (r) => <BatchDetailsTable itemId={r.item_id} itemName={r.item_name} unit={r.unit} /> }}
              pagination={{ pageSize: 10 }}
              className="custom-table"
            />
          </Card>
        )}

        {/* Modal: Add Stock */}
        <Modal
          title={<div className="flex items-center gap-2"><Plus size={18} className="text-blue-600"/> Add Stock Batch</div>}
          open={isAddStockModalVisible}
          onOk={() => addStockForm.submit()}
          onCancel={() => setIsAddStockModalVisible(false)}
          width={500}
        >
          <Form form={addStockForm} layout="vertical" onFinish={async (v) => {
             await messAPI.updateItemStock({...v, purchase_date: v.purchase_date.format('YYYY-MM-DD')});
             message.success('Stock added');
             setIsAddStockModalVisible(false);
             fetchStocks();
          }} className="mt-4">
            <Form.Item name="item_id" label="Raw Material" rules={[{required: true}]}>
              <Select placeholder="Select item" showSearch optionFilterProp="children">
                {items.map(i => <Option key={i.id} value={i.id}>{i.name} ({i.UOM?.abbreviation})</Option>)}
              </Select>
            </Form.Item>
            <div className="grid grid-cols-2 gap-4">
               <Form.Item name="quantity" label="Quantity" rules={[{required: true}]}><InputNumber className="w-full" precision={2} /></Form.Item>
               <Form.Item name="unit_price" label="Unit Price (₹)" rules={[{required: true}]}><InputNumber className="w-full" precision={2} /></Form.Item>
            </div>
            <Form.Item name="purchase_date" label="Purchase Date" initialValue={moment()}><DatePicker className="w-full" /></Form.Item>
          </Form>
        </Modal>

        {/* Modal: Monthly Report */}
        <Modal
          title="Export Unit Rate Calculation"
          open={isUnitRateModalVisible}
          onCancel={() => setIsUnitRateModalVisible(false)}
          onOk={() => unitRateForm.submit()}
        >
          <Form form={unitRateForm} layout="vertical" onFinish={async (v) => {
             const res = await messAPI.exportUnitRateCalculation({ month: v.date.month()+1, year: v.date.year() });
             const url = window.URL.createObjectURL(new Blob([res.data]));
             const link = document.createElement('a');
             link.href = url;
             link.setAttribute('download', 'Unit_Rate_Report.xlsx');
             link.click();
             setIsUnitRateModalVisible(false);
          }}>
            <Form.Item name="date" label="Select Month" initialValue={moment()} rules={[{required: true}]}>
               <DatePicker picker="month" className="w-full" />
            </Form.Item>
          </Form>
        </Modal>
      </div>

      <style>{`
        .custom-table .ant-table-thead > tr > th { background: transparent !important; border-bottom: 2px solid #f1f5f9 !important; padding: 16px 24px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }
        .custom-table .ant-table-tbody > tr > td { padding: 16px 24px; border-bottom: 1px solid #f8fafc !important; }
        .custom-table .ant-table-row-expand-icon-cell { padding-left: 24px !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default StockManagement;