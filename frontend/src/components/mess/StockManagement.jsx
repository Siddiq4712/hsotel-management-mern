import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Select, message, Space, Typography, Tag,
  Switch, Modal, Form, InputNumber, DatePicker, ConfigProvider, 
  theme, Input, Badge, Tooltip, Row, Col
} from 'antd';
import { 
  Warehouse, Plus, Download, RefreshCw, 
  Search, FileBarChart, Filter, Box, AlertCircle
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const StockManagement = () => {
  const [stocks, setStocks] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isAddStockModalVisible, setIsAddStockModalVisible] = useState(false);
  const [isUnitRateModalVisible, setIsUnitRateModalVisible] = useState(false);
  
  const [addStockForm] = Form.useForm();
  const [unitRateForm] = Form.useForm();

  // --- Data Fetching ---
  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await messAPI.getItemStock();
      const formatted = (response.data.data || []).map(s => ({
        ...s,
        key: `${s.item_id}-${s.hostel_id}`,
        item_name: s.Item?.name,
        category: s.Item?.tbl_ItemCategory?.name || 'General',
        unit: s.Item?.UOM?.abbreviation || 'unit',
        price: s.effective_unit_price
      }));
      setStocks(formatted);
    } catch (e) {
      message.error("Failed to sync inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchItems = async () => {
    try {
      const res = await messAPI.getItems();
      setItems(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchStocks();
    fetchItems();
  }, [fetchStocks]);

  // --- Client-side Search & Filtering ---
  const filteredData = useMemo(() => {
    return stocks.filter(item => {
      const matchesSearch = item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLowStock = showLowStock ? parseFloat(item.current_stock) <= parseFloat(item.minimum_stock) : true;
      return matchesSearch && matchesLowStock;
    });
  }, [stocks, searchQuery, showLowStock]);

  // --- Table Columns Definition ---
  const columns = [
    {
      title: 'Material Name',
      key: 'item_name',
      sorter: (a, b) => a.item_name.localeCompare(b.item_name),
      render: (_, r) => (
        <Space size={12}>
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
            <Box size={18} />
          </div>
          <div className="flex flex-col">
            <Text strong className="text-slate-700">{r.item_name}</Text>
            <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{r.category}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (u) => <Tag bordered={false} className="bg-slate-100 text-slate-600 px-3 rounded-md font-medium">{u}</Tag>
    },
    {
      title: 'Current Stock',
      key: 'current_stock',
      sorter: (a, b) => a.current_stock - b.current_stock,
      render: (_, r) => {
        const stock = parseFloat(r.current_stock);
        const isLow = stock <= r.minimum_stock;
        return (
          <Space direction="vertical" size={0}>
            <div className="flex items-center gap-2">
              <Text strong className={isLow ? 'text-rose-600' : 'text-emerald-600'}>
                {stock.toFixed(2)}
              </Text>
              {isLow && (
                <Tooltip title="Stock level below minimum threshold">
                  <AlertCircle size={14} className="text-rose-500" />
                </Tooltip>
              )}
            </div>
            <Text className="text-[10px] text-slate-400">Min. Req: {parseFloat(r.minimum_stock).toFixed(1)}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Market Value (Avg)',
      dataIndex: 'price',
      key: 'price',
      sorter: (a, b) => a.price - b.price,
      render: (p) => <Text className="font-mono text-indigo-600 font-semibold">₹{parseFloat(p).toFixed(2)}</Text>
    },
    {
      title: 'Stock Status',
      key: 'status',
      align: 'right',
      render: (_, r) => {
        const isLow = parseFloat(r.current_stock) <= r.minimum_stock;
        return (
          <Badge 
            status={isLow ? "error" : "success"} 
            text={isLow ? "Low Stock" : "Healthy"} 
            className="font-medium text-slate-500"
          />
        );
      }
    }
  ];

  return (
    <ConfigProvider theme={{ 
      token: { colorPrimary: '#4f46e5', borderRadius: 12 },
      components: { Table: { headerBg: '#f8fafc', headerColor: '#64748b' } }
    }}>
      <div className="p-8 bg-white min-h-screen">
        
        {/* Page Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Warehouse size={20} />
              <span className="font-bold tracking-widest text-[10px] uppercase">Inventory System</span>
            </div>
            <Title level={2} style={{ margin: 0, fontWeight: 800 }}>Stock Management</Title>
          </div>
          <Space size="middle">
            <Button icon={<RefreshCw size={16} />} onClick={fetchStocks} className="rounded-xl h-10">Sync</Button>
            <Button icon={<Download size={16} />} onClick={() => setIsUnitRateModalVisible(true)} className="rounded-xl h-10">Reports</Button>
            <Button 
              type="primary" 
              icon={<Plus size={18} />} 
              onClick={() => setIsAddStockModalVisible(true)}
              className="h-10 px-6 rounded-xl font-bold shadow-indigo-100 shadow-lg"
            >
              Add New Stock
            </Button>
          </Space>
        </div>

        {/* Toolbar: Search & Toggle */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <Input 
            prefix={<Search size={18} className="text-slate-400 mr-2" />} 
            placeholder="Quick search material or category..." 
            variant="borderless"
            className="max-w-md bg-white h-11 rounded-xl shadow-sm border border-slate-200"
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
          />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200">
               <Filter size={14} className="text-slate-400" />
               <Text className="text-xs font-bold text-slate-500">LOW STOCK ONLY</Text>
               <Switch checked={showLowStock} onChange={setShowLowStock} size="small" />
            </div>
          </div>
        </div>

        {/* The Main Table */}
        <Table
          dataSource={filteredData}
          columns={columns}
          loading={loading}
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: true,
            className: "pt-6",
            itemRender: (page, type, originalElement) => {
                if (type === 'prev') return <Button type="text" size="small">Prev</Button>;
                if (type === 'next') return <Button type="text" size="small">Next</Button>;
                return originalElement;
            }
          }}
          className="stock-table border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
        />

        {/* Modal: Add Stock */}
        <Modal
          title={<div className="flex items-center gap-2"><Plus size={18}/> Record Stock Purchase</div>}
          open={isAddStockModalVisible}
          onOk={() => addStockForm.submit()}
          onCancel={() => setIsAddStockModalVisible(false)}
          width={450}
          centered
          okText="Confirm Entry"
        >
          <Form form={addStockForm} layout="vertical" className="mt-4" onFinish={async (v) => {
             await messAPI.updateItemStock({...v, purchase_date: v.purchase_date.format('YYYY-MM-DD')});
             message.success('Stock added to warehouse');
             setIsAddStockModalVisible(false);
             fetchStocks();
          }}>
            <Form.Item name="item_id" label="Raw Material" rules={[{required: true}]}>
              <Select placeholder="Choose item" showSearch optionFilterProp="children" className="w-full">
                {items.map(i => <Option key={i.id} value={i.id}>{i.name} ({i.UOM?.abbreviation})</Option>)}
              </Select>
            </Form.Item>
            <div className="grid grid-cols-2 gap-4">
               <Form.Item name="quantity" label="Quantity Received" rules={[{required: true}]}><InputNumber className="w-full" precision={2} placeholder="0.00" /></Form.Item>
               <Form.Item name="unit_price" label="Cost Per Unit (₹)" rules={[{required: true}]}><InputNumber className="w-full" precision={2} placeholder="0.00" /></Form.Item>
            </div>
            <Form.Item name="purchase_date" label="Purchase Date" initialValue={moment()}><DatePicker className="w-full" /></Form.Item>
          </Form>
        </Modal>

        {/* Modal: Monthly Report */}
        <Modal
          title="Export Stock Report"
          open={isUnitRateModalVisible}
          onCancel={() => setIsUnitRateModalVisible(false)}
          onOk={() => unitRateForm.submit()}
          okText="Download Excel"
        >
          <Form form={unitRateForm} layout="vertical" onFinish={async (v) => {
             const res = await messAPI.exportUnitRateCalculation({ month: v.date.month()+1, year: v.date.year() });
             const url = window.URL.createObjectURL(new Blob([res.data]));
             const link = document.createElement('a');
             link.href = url;
             link.setAttribute('download', 'Stock_Report.xlsx');
             link.click();
             setIsUnitRateModalVisible(false);
          }} className="mt-4">
            <Form.Item name="date" label="Reporting Month" initialValue={moment()} rules={[{required: true}]}>
               <DatePicker picker="month" className="w-full h-11" />
            </Form.Item>
            <div className="p-4 bg-indigo-50 rounded-xl text-indigo-700 text-xs">
              This will generate an Excel report including purchase batches, current inventory levels, and FIFO valuation.
            </div>
          </Form>
        </Modal>
      </div>

      <style>{`
        .stock-table .ant-table-thead > tr > th { 
          padding: 16px 24px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #f8fafc !important;
        }
        .stock-table .ant-table-tbody > tr > td { 
          padding: 16px 24px;
        }
        .stock-table .ant-table-row:hover > td {
          background-color: #f1f5f9 !important;
        }
        .ant-table-pagination {
          padding: 0 24px 24px;
        }
      `}</style>
    </ConfigProvider>
  );
};

export default StockManagement;