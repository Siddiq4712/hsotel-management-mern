import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Popconfirm, Tag, message, Modal, Form,
  Input, Select, InputNumber, Typography, Tooltip, Row, Col, 
  ConfigProvider, theme, Skeleton, Divider
} from 'antd';
// Lucide icons for consistency
import {
  Package, Tags, Plus, Search, Edit2, Trash2, 
  Database, Boxes, Info, CheckCircle2, X, RefreshCw, Layers
} from 'lucide-react';
import { messAPI } from '../../services/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;

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

// --- 2. Meaningful Table Skeleton ---
const InventorySkeleton = () => (
  <Card className="border-none shadow-sm rounded-[32px] p-6 bg-white overflow-hidden">
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex justify-between mb-8">
        <Skeleton.Input active style={{ width: 200 }} />
        <Skeleton.Button active style={{ width: 100 }} />
      </div>
      {/* Row Skeletons */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center border-b border-slate-50 pb-4">
          <Skeleton.Avatar active shape="square" size="large" />
          <Skeleton active title={false} paragraph={{ rows: 1, width: '100%' }} />
          <Skeleton.Button active size="small" style={{ width: 80 }} />
          <Skeleton.Button active size="small" style={{ width: 60 }} />
        </div>
      ))}
    </div>
  </Card>
);

const ItemManagement = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUOMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items'); // 'items' or 'categories'
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [iRes, cRes, uRes] = await Promise.all([
        messAPI.getItems(),
        messAPI.getItemCategories(),
        messAPI.getUOMs()
      ]);
      setItems(iRes.data.data || []);
      setCategories(cRes.data.data || []);
      setUOMs(uRes.data.data || []);
    } catch (error) {
      message.error('Inventory fetch failed');
    } finally {
      // Artificial delay for smooth loader effect
      setTimeout(() => setLoading(false), 1200);
    }
  };

  const handleSaveItem = async (values) => {
    try {
      if (editingItem) {
        await messAPI.updateItem(editingItem.id, values);
        message.success('Item updated');
      } else {
        await messAPI.createItem(values);
        message.success('New item added to inventory');
      }
      setModalVisible(false);
      fetchData();
    } catch (e) { message.error("Save failed"); }
  };

  const showBatches = async (itemId) => {
    try {
      const res = await messAPI.getItemBatches(itemId);
      const batches = (res.data.data || []).sort((a,b) => new Date(a.purchase_date) - new Date(b.purchase_date));
      const nextIndex = batches.findIndex(b => b.status === 'active' && b.quantity_remaining > 0);

      Modal.info({
        title: <div className="flex items-center gap-2"><Layers size={18} className="text-blue-600"/> FIFO Batch Flow</div>,
        width: 700,
        className: 'rounded-2xl',
        content: (
          <Table 
            className="mt-4"
            dataSource={batches}
            pagination={false}
            size="small"
            columns={[
              { title: 'Purchase Date', dataIndex: 'purchase_date', render: d => moment(d).format('DD MMM YY') },
              { title: 'Rem. Stock', render: (_, r) => <Text strong>{parseFloat(r.quantity_remaining).toFixed(2)}</Text> },
              { title: 'Status', render: (_, r, idx) => (
                <Space>
                  <Tag color={r.status === 'active' ? 'processing' : 'default'}>{r.status.toUpperCase()}</Tag>
                  {idx === nextIndex && <Tag color="blue" className="animate-pulse">NEXT FOR FIFO</Tag>}
                </Space>
              )}
            ]}
          />
        )
      });
    } catch (e) { message.error("Error loading batches"); }
  };

  const itemColumns = [
    { 
      title: 'Item Name', 
      dataIndex: 'name', 
      render: (t) => <Text strong className="text-slate-700">{t}</Text> 
    },
    { 
      title: 'Category', 
      dataIndex: ['tbl_ItemCategory', 'name'], 
      render: t => <Tag bordered={false} className="bg-blue-50 text-blue-600 font-medium px-3 rounded-md">{t || 'General'}</Tag> 
    },
    { 
      title: 'Stock Level', 
      key: 'stock', 
      render: (_, r) => {
        const qty = parseFloat(r.stock_quantity || 0);
        const low = qty < 10;
        return (
          <Space direction="vertical" size={0}>
            <Text strong className={low ? 'text-rose-500' : 'text-emerald-600'}>{qty.toFixed(2)}</Text>
            <Text className="text-[10px] text-slate-400 uppercase font-bold">{r.UOM?.abbreviation}</Text>
          </Space>
        );
      }
    },
    { 
      title: 'Unit Price', 
      dataIndex: 'unit_price', 
      render: p => <Text className="text-slate-600">₹{parseFloat(p || 0).toFixed(2)}</Text> 
    },
    {
      title: 'Actions',
      align: 'right',
      render: (_, record) => (
        <Space>
          {/* <Tooltip title="Inventory Batches"><Button icon={<Layers size={14} />} onClick={() => showBatches(record.id)} /></Tooltip> */}
          <Button icon={<Edit2 size={14} />} onClick={() => { setEditingItem(record); form.setFieldsValue(record); setModalVisible(true); }} />
          <Popconfirm title="Delete item?" onConfirm={() => messAPI.deleteItem(record.id).then(fetchData)}>
            <Button danger icon={<Trash2 size={14} />} ghost />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const categoryColumns = [
    { title: 'Category Name', dataIndex: 'name', render: t => <Text strong>{t}</Text> },
    { title: 'Description', dataIndex: 'description', render: d => <Text type="secondary">{d || '-'}</Text> },
    {
        title: 'Actions',
        align: 'right',
        render: (_, record) => (
          <Space>
            <Button icon={<Edit2 size={14} />} onClick={() => { setEditingCategory(record); categoryForm.setFieldsValue(record); setCategoryModalVisible(true); }} />
            <Popconfirm title="Delete category?" onConfirm={() => messAPI.deleteItemCategory(record.id).then(fetchData)}>
              <Button danger icon={<Trash2 size={14} />} ghost />
            </Popconfirm>
          </Space>
        ),
      },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#2563eb', borderRadius: 12 } }}>
      <div className="p-8 bg-slate-50 min-h-screen">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Database className="text-white" size={24} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0 }}>Inventory Master</Title>
              <Text type="secondary">Real-time stock tracking and raw material control</Text>
            </div>
          </div>
          <Space>
            <Button icon={<RefreshCw size={16}/>} onClick={fetchData} className="rounded-xl h-12 flex items-center gap-2">Sync Stock</Button>
            <Button 
                type="primary" 
                size="large" 
                icon={<Plus size={18}/>} 
                onClick={() => activeTab === 'items' ? (() => { setEditingItem(null); form.resetFields(); setModalVisible(true); })() : (() => { setEditingCategory(null); categoryForm.resetFields(); setCategoryModalVisible(true); })()}
                className="flex items-center gap-2 shadow-lg shadow-blue-100 h-12 px-6"
            >
                {activeTab === 'items' ? 'Add Raw Material' : 'Create Category'}
            </Button>
          </Space>
        </div>

        {/* Custom Pill Switcher */}
        <div className="mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 inline-flex">
          <button 
            onClick={() => setActiveTab('items')}
            className={`px-8 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all ${activeTab === 'items' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Package size={16} /> Items Master
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`px-8 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm transition-all ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Tags size={16} /> Item Categories
          </button>
        </div>

        {/* Content Logic */}
        {loading ? (
          <InventorySkeleton />
        ) : (activeTab === 'items' ? items : categories).length === 0 ? (
          <EmptyState 
            icon={activeTab === 'items' ? Boxes : Tags}
            title={activeTab === 'items' ? "Empty Inventory" : "No Categories Set"}
            subtitle={activeTab === 'items' ? "You haven't added any raw materials yet. Start by defining items to build your recipes." : "Categories help organize your store. Add your first category to get started."}
            actionText={activeTab === 'items' ? "Define First Item" : "Create Category"}
            onAction={activeTab === 'items' ? () => { setEditingItem(null); form.resetFields(); setModalVisible(true); } : () => { setEditingCategory(null); categoryForm.resetFields(); setCategoryModalVisible(true); }}
          />
        ) : (
          <Card className="border-none shadow-sm rounded-[32px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700" bodyStyle={{ padding: 0 }}>
             {/* Toolbar inside card */}
            <div className="p-6 border-b border-slate-50 flex items-center gap-4">
                <Search size={18} className="text-slate-300" />
                <Input 
                    placeholder="Search by name..." 
                    bordered={false} 
                    className="max-w-md bg-slate-50/50 rounded-lg"
                    onChange={e => setSearchText(e.target.value)}
                />
            </div>
            <Table
              columns={activeTab === 'items' ? itemColumns : categoryColumns}
              dataSource={activeTab === 'items' 
                ? items.filter(i => i.name.toLowerCase().includes(searchText.toLowerCase())) 
                : categories.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()))}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              className="custom-table"
            />
          </Card>
        )}

        {/* Item Modal */}
        <Modal
          title={<div className="flex items-center gap-2"><Plus size={18} className="text-blue-600"/> {editingItem ? 'Update Stock Item' : 'Add New Item'}</div>}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={500}
          className="rounded-2xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSaveItem} className="mt-4">
            <Form.Item name="name" label="Item Name" rules={[{ required: true }]}><Input placeholder="e.g., Basmati Rice" /></Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="category_id" label="Category" rules={[{ required: true }]}><Select options={categories.map(c => ({label: c.name, value: c.id}))} /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="unit_id" label="Base Unit" rules={[{ required: true }]}><Select options={uoms.map(u => ({label: `${u.name} (${u.abbreviation})`, value: u.id}))} /></Form.Item>
              </Col>
            </Row>
            <Form.Item name="unit_price" label="Purchase Price (₹)" rules={[{ required: true }]}><InputNumber className="w-full" precision={2} step={0.01} /></Form.Item>
            <Form.Item name="description" label="Storage Notes"><Input.TextArea rows={3} /></Form.Item>
          </Form>
        </Modal>

        {/* Category Modal */}
        <Modal title="Manage Category" open={categoryModalVisible} onCancel={() => setCategoryModalVisible(false)} onOk={() => categoryForm.submit()}>
          <Form form={categoryForm} layout="vertical" onFinish={(v) => messAPI.createItemCategory(v).then(fetchData).then(() => setCategoryModalVisible(false))}>
            <Form.Item name="name" label="Category Name" rules={[{required: true}]}><Input /></Form.Item>
            <Form.Item name="description" label="Description"><Input.TextArea /></Form.Item>
          </Form>
        </Modal>

      </div>
      <style>{`
        .custom-table .ant-table-thead > tr > th { background: transparent !important; border-bottom: 2px solid #f1f5f9 !important; padding: 16px 24px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }
        .custom-table .ant-table-tbody > tr > td { padding: 16px 24px; border-bottom: 1px solid #f8fafc !important; }
        .custom-table .ant-table-tbody > tr:hover > td { background: #f8fafc !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default ItemManagement;