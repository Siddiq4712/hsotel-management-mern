import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Table, Button, Space, Select, InputNumber, message, Modal,
  Form, Switch, Popconfirm, Tag, Tabs, Typography, Input, Row, Col,
  ConfigProvider, theme, Skeleton, Divider, Tooltip
} from 'antd';
import {
  Plus, FileSpreadsheet, Trash2, Search, Link, Store, 
  Package, LayoutGrid, CheckCircle2, Info, ChevronRight, X, Filter
} from 'lucide-react';
import { messAPI } from '../../services/api';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { Text, Title } = Typography;

// --- Skeleton for Loading State ---
const MappingSkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-6">
      <div className="flex gap-4">
        <Skeleton.Input active style={{ width: '100%' }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-6">
          <Skeleton.Avatar active shape="circle" size="large" />
          <div className="flex-1"><Skeleton active paragraph={{ rows: 1 }} /></div>
          <Skeleton.Button active style={{ width: 80 }} />
        </div>
      ))}
    </div>
  </Card>
);

const ItemStoreMapping = () => {
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [itemStores, setItemStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(''); // Live Search State
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [itms, strs, maps] = await Promise.all([
        messAPI.getItems(),
        messAPI.getStores(),
        messAPI.getItemStores()
      ]);
      setItems(itms.data.data || []);
      setStores(strs.data.data || []);
      setItemStores(maps.data.data || []);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  // --- LIVE SEARCH LOGIC ---
  // Filters the data directly on the page as you type
  const filteredMappings = useMemo(() => {
    if (!searchText) return itemStores;
    const lowerSearch = searchText.toLowerCase();
    return itemStores.filter(m => 
      (m.Item?.name || '').toLowerCase().includes(lowerSearch) ||
      (m.Store?.name || '').toLowerCase().includes(lowerSearch) ||
      (m.Item?.tbl_ItemCategory?.name || '').toLowerCase().includes(lowerSearch)
    );
  }, [itemStores, searchText]);

  const handleExportExcel = () => {
    if (filteredMappings.length === 0) return message.warning('No data to export.');
    const exportData = filteredMappings.map(mapping => ({
      'Item Name': mapping.Item?.name || 'N/A',
      'Store Name': mapping.Store?.name || 'N/A',
      'Unit Price': parseFloat(mapping.price || 0).toFixed(2),
      'Preferred': mapping.is_preferred ? 'Yes' : 'No',
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mappings');
    XLSX.writeFile(workbook, `Filtered_Mappings_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleSubmit = async (values) => {
    setConfirmLoading(true);
    try {
      const { store_id, items: mappingItems } = values;
      for (const item of mappingItems) {
        await messAPI.mapItemToStore({
          item_id: item.item_id,
          store_id,
          price: item.price,
          is_preferred: item.is_preferred || false,
        });
      }
      message.success('Mappings updated successfully');
      setModalVisible(false);
      fetchInitialData();
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      title: 'Item Details',
      key: 'item',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-slate-700">{r.Item?.name}</Text>
          <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{r.Item?.tbl_ItemCategory?.name}</Text>
        </Space>
      )
    },
    {
      title: 'Linked Store',
      key: 'store',
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <Store size={14} className="text-blue-500" />
          <Text className="text-sm font-medium text-slate-600">{r.Store?.name}</Text>
        </div>
      )
    },
    {
      title: 'Unit Price',
      dataIndex: 'price',
      align: 'right',
      render: (p) => <Text className="text-blue-600 font-bold">₹{parseFloat(p || 0).toFixed(2)}</Text>
    },
    {
      title: 'Priority',
      dataIndex: 'is_preferred',
      align: 'center',
      render: (fav) => fav ? <Tag color="success" className="rounded-full border-none px-3 font-bold text-[10px] uppercase">Preferred</Tag> : <Text type="secondary">—</Text>
    },
    {
      title: 'Actions',
      align: 'right',
      render: (_, record) => (
        <Popconfirm title="Remove mapping?" onConfirm={() => messAPI.removeItemStoreMapping(record.id).then(fetchInitialData)}>
          <Button type="text" danger icon={<Trash2 size={16} />} className="flex items-center justify-center hover:bg-rose-50 rounded-lg" />
        </Popconfirm>
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
              <Link className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Mapping Hub</Title>
              <Text type="secondary">Manage supplier relationships and item pricing</Text>
            </div>
          </div>
          <Space>
            <Button icon={<FileSpreadsheet size={18}/>} onClick={handleExportExcel} className="rounded-xl h-12">Export Results</Button>
            <Button type="primary" icon={<Plus size={18}/>} onClick={() => setModalVisible(true)} className="rounded-xl h-12 shadow-lg shadow-blue-100 font-semibold">Add New Mapping</Button>
          </Space>
        </div>

        {/* --- LIVE SEARCH BAR --- */}
        <Card className="border-none shadow-sm rounded-2xl mb-6">
            <div className="flex items-center gap-3 bg-slate-50 p-3 px-5 rounded-2xl border border-slate-100 w-full transition-all focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-md">
                <Search size={20} className="text-slate-400" />
                <Input 
                    placeholder="Quick search by item name, store name, or category..." 
                    bordered={false} 
                    className="text-base"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    allowClear
                />
                <Divider type="vertical" className="h-6 bg-slate-200" />
                <div className="flex items-center gap-2 text-slate-400 px-2">
                    <Filter size={16} />
                    <Text className="text-xs font-bold uppercase tracking-tighter">Live Results</Text>
                </div>
            </div>
        </Card>

        {loading ? <MappingSkeleton /> : (
            <Card className="border-none shadow-sm rounded-[32px] overflow-hidden" bodyStyle={{ padding: 0 }}>
                <Table 
                    dataSource={filteredMappings} 
                    columns={columns} 
                    pagination={{ pageSize: 10, showTotal: (total) => `Showing ${total} mappings` }} 
                    rowKey="id" 
                />
            </Card>
        )}

        {/* --- Bulk Mapping Modal --- */}
        <Modal
          title={<div className="flex items-center gap-2 text-blue-600"><Plus size={18}/> Bulk Link Items</div>}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={900}
          className="rounded-2xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ items: [{}] }}>
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mb-6">
              <Form.Item name="store_id" label={<Text strong>Target Store</Text>} rules={[{ required: true }]}>
                <Select placeholder="Select the store to map items to..." className="h-11">
                  {stores.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </div>

            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} className="bg-white p-5 rounded-2xl border border-slate-100 mb-4 shadow-sm relative group hover:border-blue-200 transition-all">
                        <Row gutter={16} align="middle">
                          <Col span={10}>
                            <Form.Item {...restField} name={[name, 'item_id']} label="Item" rules={[{ required: true }]}>
                              <Select placeholder="Select item..." showSearch optionFilterProp="children">
                                {items.map(i => <Option key={i.id} value={i.id}>{i.name}</Option>)}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item {...restField} name={[name, 'price']} label="Contract Price (₹)" rules={[{ required: true }]}>
                              <InputNumber className="w-full" precision={2} placeholder="0.00" prefix="₹" />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item {...restField} name={[name, 'is_preferred']} label="Preferred" valuePropName="checked">
                              <Switch size="small" />
                            </Form.Item>
                          </Col>
                          <Col span={2}>
                            <Button type="text" danger icon={<X size={18} />} onClick={() => remove(name)} className="mt-6 flex items-center justify-center hover:bg-rose-50 rounded-lg" />
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </div>
                  <Button type="dashed" onClick={() => add()} block icon={<Plus size={16}/>} className="h-12 rounded-xl mb-4 border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-600">
                    Add Another Item Row
                  </Button>
                </>
              )}
            </Form.List>

            <div className="flex justify-end gap-3 mt-8 border-t pt-6">
              <Button onClick={() => setModalVisible(false)} className="rounded-xl h-11 px-6">Cancel</Button>
              <Button type="primary" htmlType="submit" loading={confirmLoading} className="rounded-xl h-11 px-8 font-bold">
                Save All Mappings
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ItemStoreMapping;