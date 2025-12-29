import React, { useEffect, useState, useMemo } from 'react';
import { 
  Card, DatePicker, Table, Button, message, Typography, 
  ConfigProvider, theme, Skeleton, Space, Tag, Tooltip 
} from 'antd';
import { 
  FileSpreadsheet, Calendar, Search, RefreshCw, 
  ShoppingBag, ClipboardList, Info, PackageSearch 
} from 'lucide-react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { messAPI } from '../../services/api';

const { Title, Text } = Typography;

// --- 1. Meaningful Empty State for Purchase Suggestions ---
const EmptySuggestions = () => (
  <div className="flex flex-col items-center justify-center p-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100 my-4 animate-in fade-in zoom-in duration-500">
    <div className="p-6 bg-blue-50 rounded-full mb-6">
      <PackageSearch size={64} className="text-blue-300" strokeWidth={1.5} />
    </div>
    <Title level={4} className="text-slate-800 mb-2">No Suggestions Found</Title>
    <Text className="text-slate-500 block mb-8 max-w-sm mx-auto">
      There are no purchase suggestions for the selected month. This usually means your stock levels are sufficient or no consumption patterns were detected.
    </Text>
  </div>
);

// --- 2. Skeleton Loader ---
const PurchaseSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton.Input active style={{ width: 250 }} />
        <Skeleton.Button active style={{ width: 120 }} />
      </div>
      {[...Array(6)].map((_, i) => (
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

const PurchaseOrder = () => {
  const [loading, setLoading] = useState(true);
  const [pickerValue, setPickerValue] = useState(dayjs());
  const [data, setData] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        month: pickerValue.month() + 1,
        year: pickerValue.year(),
      };
      const response = await messAPI.getPurchaseOrders(params);
      setData(response.data.data || []);
    } catch (error) {
      message.error(error.message || 'Failed to fetch suggestions');
    } finally {
      // Small timeout to prevent flicker on fast connections
      setTimeout(() => setLoading(false), 800);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pickerValue]);

  const handleExport = () => {
    if (!data.length) {
      message.warning('Nothing to export.');
      return;
    }

    const rows = data.map((row) => ({
      'Item Name': row.item_name,
      'Current Stock': row.current_stock,
      'Required Quantity': row.quantity_needed,
      'Status': row.current_stock <= 0 ? 'Out of Stock' : 'Low Stock'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Suggestions');

    const label = pickerValue.format('MMMM_YYYY');
    XLSX.writeFile(workbook, `Purchase_Order_Suggestions_${label}.xlsx`);
    message.success(`Exported ${label} suggestions successfully`);
  };

  const columns = [
    { 
      title: 'Item Description', 
      dataIndex: 'item_name', 
      key: 'item_name',
      render: (text) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700 text-base">{text}</Text>
          <Text className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Inventory Item</Text>
        </Space>
      )
    },
    { 
      title: 'Stock Status', 
      dataIndex: 'current_stock', 
      key: 'current_stock',
      align: 'right',
      render: (val) => (
        <Space direction="vertical" align="end" size={0}>
          <Text strong className={val <= 0 ? 'text-rose-500' : 'text-amber-500'}>
            {parseFloat(val).toFixed(2)} units
          </Text>
          <Tag color={val <= 0 ? 'error' : 'warning'} className="m-0 border-none rounded-full px-2 text-[9px] font-bold">
            {val <= 0 ? 'DEPLETED' : 'LOW STOCK'}
          </Tag>
        </Space>
      )
    },
    { 
      title: 'Quantity Needed', 
      dataIndex: 'quantity_needed', 
      key: 'quantity_needed',
      align: 'right',
      render: (val) => (
        <div className="bg-blue-50 py-1 px-4 rounded-xl inline-block border border-blue-100">
          <Text strong className="text-blue-600 text-lg">
            {parseFloat(val).toFixed(2)}
          </Text>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: () => (
        <Tooltip title="View historical consumption for this item">
          <Button icon={<Search size={14} />} className="rounded-lg h-9 w-9 flex items-center justify-center" />
        </Tooltip>
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
              <ClipboardList className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Purchase Suggestions</Title>
              <Text type="secondary">AI-driven stock replenishment recommendations</Text>
            </div>
          </div>
          <Space size="middle">
            <Button 
                icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />} 
                onClick={fetchData} 
                className="rounded-xl h-12"
            >
                Refresh
            </Button>
            <Button 
                type="primary" 
                icon={<FileSpreadsheet size={18}/>} 
                onClick={handleExport} 
                className="rounded-xl h-12 shadow-lg shadow-blue-100 flex items-center gap-2 font-semibold"
            >
                Export Order
            </Button>
          </Space>
        </div>

        {/* Filter Toolbar */}
        <Card className="border-none shadow-sm rounded-2xl mb-6">
          <div className="flex justify-between items-center">
            <Space size="large">
              <div className="flex items-center gap-3 bg-slate-100 p-2 px-4 rounded-xl border border-slate-200">
                <Calendar size={16} className="text-slate-500" />
                <DatePicker
                  picker="month"
                  allowClear={false}
                  bordered={false}
                  value={pickerValue}
                  onChange={(value) => setPickerValue(value || dayjs())}
                  className="p-0 font-medium"
                />
              </div>
            </Space>
            <Space className="bg-blue-50/50 p-2 px-4 rounded-xl border border-blue-100">
                <Info size={16} className="text-blue-500" />
                <Text className="text-blue-700 text-xs">Suggestions are based on monthly minimum stock requirements.</Text>
            </Space>
          </div>
        </Card>

        {/* Data Content */}
        {loading ? (
          <PurchaseSkeleton />
        ) : data.length === 0 ? (
          <EmptySuggestions />
        ) : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="item_id"
              columns={columns}
              dataSource={data}
              pagination={false}
              className="purchase-order-table"
            />
          </Card>
        )}
      </div>
    </ConfigProvider>
  );
};

export default PurchaseOrder;